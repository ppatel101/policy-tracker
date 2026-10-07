import { supabase, formatSupabaseError, isSupabaseConfigured } from './supabase';
import { localStorage } from '../storage/localStorage';
import { mapRowToPolicy, mapPolicyToRow, createPolicyModel } from '../models/policy';
import { mapPaymentToRow, mapRowToPayment } from '../models/payment';
import { calculateEndDate, generatePaymentSchedule } from '../utils/dateUtils';
import { generateUUID } from '../utils/uuid';
import { POLICY_STATUSES, PAYMENT_STATUSES } from '../utils/constants';

export const policyService = {
  /**
   * Fetch all policies for user (Supabase with local cache fallback)
   */
  async getPolicies(userId) {
    if (!userId) {
      return { policies: await localStorage.getCachedPolicies(), fromCache: true, error: null };
    }

    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('policies')
          .select('*')
          .eq('user_id', userId)
          .order('next_due_date', { ascending: true });

        if (error) throw error;

        const cachedPolicies = await localStorage.getCachedPolicies();
        const cachedMap = new Map((cachedPolicies || []).map((p) => [p.id, p]));

        const policies = (data || []).map((row) => {
          const mapped = mapRowToPolicy(row);
          const cached = cachedMap.get(mapped.id);
          if (cached) {
            if ((mapped.sumAssured === null || mapped.sumAssured === undefined) && cached.sumAssured != null) {
              mapped.sumAssured = cached.sumAssured;
              mapped.idv = cached.sumAssured;
            } else if ((mapped.idv === null || mapped.idv === undefined) && cached.idv != null) {
              mapped.idv = cached.idv;
              if (mapped.sumAssured == null) mapped.sumAssured = cached.idv;
            }
            if (!mapped.tpaName && cached.tpaName) mapped.tpaName = cached.tpaName;
            if ((!mapped.coveredMembers || mapped.coveredMembers.length === 0) && cached.coveredMembers?.length > 0) {
              mapped.coveredMembers = cached.coveredMembers;
            }
          }
          return mapped;
        });
        await localStorage.setCachedPolicies(policies);
        return { policies, fromCache: false, error: null };
      }
    } catch (err) {
      console.warn('[policyService] Supabase fetch failed, fallback to local cache:', err);
      const cached = await localStorage.getCachedPolicies();
      return {
        policies: cached,
        fromCache: true,
        error: formatSupabaseError(err, 'Unable to load policies from server. Showing cached data.'),
      };
    }

    const cached = await localStorage.getCachedPolicies();
    return { policies: cached, fromCache: true, error: null };
  },

  /**
   * Fetch a single policy by ID with its payments
   */
  async getPolicyById(policyId, userId) {
    try {
      if (isSupabaseConfigured() && userId) {
        const { data: policyData, error: policyError } = await supabase
          .from('policies')
          .select('*')
          .eq('id', policyId)
          .eq('user_id', userId)
          .single();

        if (policyError) throw policyError;

        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .eq('policy_id', policyId)
          .eq('user_id', userId)
          .order('due_date', { ascending: true });

        const policy = mapRowToPolicy(policyData);
        if (policy) {
          const allCached = await localStorage.getCachedPolicies();
          const cached = (allCached || []).find((p) => p.id === policyId);
          if (cached) {
            if ((policy.sumAssured === null || policy.sumAssured === undefined) && cached.sumAssured != null) {
              policy.sumAssured = cached.sumAssured;
              policy.idv = cached.sumAssured;
            } else if ((policy.idv === null || policy.idv === undefined) && cached.idv != null) {
              policy.idv = cached.idv;
              if (policy.sumAssured == null) policy.sumAssured = cached.idv;
            }
            if (!policy.tpaName && cached.tpaName) policy.tpaName = cached.tpaName;
            if ((!policy.coveredMembers || policy.coveredMembers.length === 0) && cached.coveredMembers?.length > 0) {
              policy.coveredMembers = cached.coveredMembers;
            }
          }
        }
        const payments = (paymentsData || []).map(mapRowToPayment);

        return { policy, payments, error: null };
      }
    } catch (err) {
      console.warn('[policyService] getPolicyById error, reading from local cache:', err);
    }

    // Local fallback
    const allPolicies = await localStorage.getCachedPolicies();
    const policy = allPolicies.find((p) => p.id === policyId) || null;
    const allPayments = await localStorage.getCachedPayments();
    const payments = allPayments.filter((p) => p.policyId === policyId);

    return { policy, payments, error: null };
  },

  /**
   * Create a new policy and generate its payment schedule
   */
  async createPolicy(policyInput, userId) {
    const policyId = policyInput.id || generateUUID();
    const durationYears = parseInt(policyInput.durationYears, 10) || 1;
    const calculatedEndDate = policyInput.endDate || calculateEndDate(policyInput.startDate, durationYears);

    const policy = createPolicyModel({
      ...policyInput,
      id: policyId,
      userId,
      endDate: calculatedEndDate,
      durationYears,
      status: policyInput.status || POLICY_STATUSES.ACTIVE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Generate schedule of installments
    const schedule = generatePaymentSchedule(policy).map((p) => ({
      ...p,
      id: generateUUID(),
      policyId,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    let savedRemotely = false;
    let remoteError = null;

    if (isSupabaseConfigured() && userId) {
      try {
        const policyRow = mapPolicyToRow(policy);
        let { error: insertPolicyError } = await supabase
          .from('policies')
          .insert(policyRow);

        const insertErrMsg = insertPolicyError
          ? `${insertPolicyError.message || ''} ${insertPolicyError.details || ''} ${insertPolicyError.hint || ''}`.toLowerCase()
          : '';

        if (insertPolicyError && (insertPolicyError.code === 'PGRST204' || insertErrMsg.includes('column'))) {
          const fallbackRow = { ...policyRow };
          const matchCol = insertErrMsg.match(/could not find the '([^']+)' column/i);
          if (matchCol && matchCol[1]) {
            delete fallbackRow[matchCol[1]];
          } else {
            if (insertErrMsg.includes('covered_members')) delete fallbackRow.covered_members;
            if (insertErrMsg.includes('tpa')) delete fallbackRow.tpa_name;
            if (insertErrMsg.includes('idv')) delete fallbackRow.idv;
            if (insertErrMsg.includes('sum_assured')) delete fallbackRow.sum_assured;
          }

          let retry = await supabase.from('policies').insert(fallbackRow);
          if (retry.error && retry.error.code === 'PGRST204') {
            const secondErrMsg = `${retry.error.message || ''}`.toLowerCase();
            const secondMatch = secondErrMsg.match(/could not find the '([^']+)' column/i);
            if (secondMatch && secondMatch[1]) {
              delete fallbackRow[secondMatch[1]];
            } else {
              delete fallbackRow.covered_members;
              delete fallbackRow.tpa_name;
            }
            retry = await supabase.from('policies').insert(fallbackRow);
          }
          insertPolicyError = retry.error;
        }

        if (insertPolicyError) throw insertPolicyError;

        if (schedule.length > 0) {
          const paymentRows = schedule.map(mapPaymentToRow);
          const { error: insertPaymentsError } = await supabase
            .from('payments')
            .insert(paymentRows);

          if (insertPaymentsError) {
            console.warn('[policyService] Payment schedule insert warning:', insertPaymentsError);
          }
        }

        savedRemotely = true;
      } catch (err) {
        console.warn('[policyService] Create policy remote error (saving locally):', err);
        remoteError = formatSupabaseError(err, 'Could not save to server. Saved locally.');
      }
    }

    // Always update local cache
    const cachedPolicies = await localStorage.getCachedPolicies();
    const updatedPolicies = [policy, ...cachedPolicies.filter((p) => p.id !== policyId)];
    await localStorage.setCachedPolicies(updatedPolicies);

    const cachedPayments = await localStorage.getCachedPayments();
    const updatedPayments = [...schedule, ...cachedPayments];
    await localStorage.setCachedPayments(updatedPayments);

    // If not saved remotely, queue for sync
    if (!savedRemotely) {
      await localStorage.addPendingSyncOperation({
        id: 'sync_policy_create_' + policyId,
        type: 'CREATE_POLICY',
        entity: 'policy',
        data: { policy, schedule },
      });
    }

    return { policy, schedule, savedRemotely, error: remoteError };
  },

  /**
   * Update an existing policy
   */
  async updatePolicy(policyId, updates, userId) {
    const cachedPolicies = await localStorage.getCachedPolicies();
    const existing = cachedPolicies.find((p) => p.id === policyId);

    const updatedPolicy = {
      ...(existing || {}),
      ...updates,
      id: policyId,
      userId,
      updatedAt: new Date().toISOString(),
    };

    let savedRemotely = false;
    let remoteError = null;

    if (isSupabaseConfigured() && userId) {
      try {
        const row = mapPolicyToRow(updatedPolicy);
        let { error } = await supabase
          .from('policies')
          .update(row)
          .eq('id', policyId)
          .eq('user_id', userId);

        const updateErrMsg = error
          ? `${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase()
          : '';

        if (error && (error.code === 'PGRST204' || updateErrMsg.includes('column'))) {
          const fallbackRow = { ...row };
          const matchCol = updateErrMsg.match(/could not find the '([^']+)' column/i);
          if (matchCol && matchCol[1]) {
            delete fallbackRow[matchCol[1]];
          } else {
            if (updateErrMsg.includes('covered_members')) delete fallbackRow.covered_members;
            if (updateErrMsg.includes('tpa')) delete fallbackRow.tpa_name;
            if (updateErrMsg.includes('idv')) delete fallbackRow.idv;
            if (updateErrMsg.includes('sum_assured')) delete fallbackRow.sum_assured;
          }

          let retry = await supabase
            .from('policies')
            .update(fallbackRow)
            .eq('id', policyId)
            .eq('user_id', userId);

          if (retry.error && retry.error.code === 'PGRST204') {
            const secondErrMsg = `${retry.error.message || ''}`.toLowerCase();
            const secondMatch = secondErrMsg.match(/could not find the '([^']+)' column/i);
            if (secondMatch && secondMatch[1]) {
              delete fallbackRow[secondMatch[1]];
            } else {
              delete fallbackRow.covered_members;
              delete fallbackRow.tpa_name;
            }
            retry = await supabase
              .from('policies')
              .update(fallbackRow)
              .eq('id', policyId)
              .eq('user_id', userId);
          }
          error = retry.error;
        }

        if (error) throw error;
        savedRemotely = true;
      } catch (err) {
        console.warn('[policyService] Update policy remote error:', err);
        remoteError = formatSupabaseError(err, 'Failed to update on server. Saved locally.');
      }
    }

    // Update local cache
    const newPolicies = cachedPolicies.map((p) => (p.id === policyId ? updatedPolicy : p));
    await localStorage.setCachedPolicies(newPolicies);

    if (!savedRemotely) {
      await localStorage.addPendingSyncOperation({
        id: 'sync_policy_update_' + policyId,
        type: 'UPDATE_POLICY',
        entity: 'policy',
        data: { policy: updatedPolicy },
      });
    }

    return { policy: updatedPolicy, savedRemotely, error: remoteError };
  },

  /**
   * Delete a policy and its payments
   */
  async deletePolicy(policyId, userId) {
    let deletedRemotely = false;
    let remoteError = null;

    if (isSupabaseConfigured() && userId) {
      try {
        // Deleting policy cascades to payments via foreign key ON DELETE CASCADE
        const { error } = await supabase
          .from('policies')
          .delete()
          .eq('id', policyId)
          .eq('user_id', userId);

        if (error) throw error;
        deletedRemotely = true;
      } catch (err) {
        console.warn('[policyService] Delete policy remote error:', err);
        remoteError = formatSupabaseError(err, 'Failed to delete on server. Deleted locally.');
      }
    }

    // Update local cache
    const cachedPolicies = await localStorage.getCachedPolicies();
    await localStorage.setCachedPolicies(cachedPolicies.filter((p) => p.id !== policyId));

    const cachedPayments = await localStorage.getCachedPayments();
    await localStorage.setCachedPayments(cachedPayments.filter((p) => p.policyId !== policyId));

    if (!deletedRemotely) {
      await localStorage.addPendingSyncOperation({
        id: 'sync_policy_delete_' + policyId,
        type: 'DELETE_POLICY',
        entity: 'policy',
        data: { policyId },
      });
    }

    return { success: true, deletedRemotely, error: remoteError };
  },

  /**
   * Client-side search for policies (case-insensitive across name, company, policy number)
   */
  searchPolicies(policies = [], query = '') {
    if (!query || !query.trim()) return policies;
    const lower = query.trim().toLowerCase();
    return policies.filter((p) => {
      const name = (p.policyName || '').toLowerCase();
      const company = (p.companyName || '').toLowerCase();
      const num = (p.policyNumber || '').toLowerCase();
      return name.includes(lower) || company.includes(lower) || num.includes(lower);
    });
  },

  /**
   * Client-side filtering by status
   */
  filterPolicies(policies = [], filterId = 'all') {
    if (!filterId || filterId === 'all') return policies;
    return policies.filter((p) => (p.status || '').toLowerCase() === filterId.toLowerCase());
  },

  /**
   * Client-side sorting
   */
  sortPolicies(policies = [], sortBy = 'next_due_date') {
    const list = [...policies];
    switch (sortBy) {
      case 'next_due_date':
        return list.sort((a, b) => new Date(a.nextDueDate || '9999').getTime() - new Date(b.nextDueDate || '9999').getTime());
      case 'policy_name':
        return list.sort((a, b) => (a.policyName || '').localeCompare(b.policyName || ''));
      case 'company_name':
        return list.sort((a, b) => (a.companyName || '').localeCompare(b.companyName || ''));
      case 'premium_amount':
        return list.sort((a, b) => Number(b.premiumAmount || 0) - Number(a.premiumAmount || 0));
      case 'recently_added':
        return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      default:
        return list;
    }
  },
};
