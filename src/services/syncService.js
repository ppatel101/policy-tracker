import { supabase, isSupabaseConfigured } from './supabase';
import { localStorage } from '../storage/localStorage';
import { mapPolicyToRow, mapRowToPolicy } from '../models/policy';
import { mapPaymentToRow, mapRowToPayment } from '../models/payment';
import { PAYMENT_STATUSES } from '../utils/constants';

let isSyncInProgress = false;

export const syncService = {
  /**
   * Synchronize pending offline operations with Supabase
   */
  async syncPendingOperations(userId) {
    if (!isSupabaseConfigured() || !userId) {
      return { success: false, syncedCount: 0, errors: ['Supabase not configured or no user'] };
    }

    const pendingOps = await localStorage.getPendingSyncOperations();
    if (!pendingOps || pendingOps.length === 0) {
      return { success: true, syncedCount: 0, errors: [] };
    }

    const remainingOps = [];
    let syncedCount = 0;
    const errors = [];

    for (const op of pendingOps) {
      try {
        switch (op.type) {
          case 'CREATE_POLICY': {
            const { policy, schedule } = op.data;
            policy.userId = userId;
            const policyRow = mapPolicyToRow(policy);

            // Upsert policy
            const { error: pErr } = await supabase.from('policies').upsert(policyRow);
            if (pErr) throw pErr;

            // Upsert payment schedule if present
            if (schedule && schedule.length > 0) {
              const paymentRows = schedule.map((item) => {
                item.userId = userId;
                return mapPaymentToRow(item);
              });
              const { error: payErr } = await supabase.from('payments').upsert(paymentRows);
              if (payErr) console.warn('[syncService] Warning upserting schedule:', payErr);
            }
            syncedCount++;
            break;
          }

          case 'UPDATE_POLICY': {
            const { policy } = op.data;
            policy.userId = userId;
            const row = mapPolicyToRow(policy);
            const { error } = await supabase
              .from('policies')
              .update(row)
              .eq('id', policy.id)
              .eq('user_id', userId);
            if (error) throw error;
            syncedCount++;
            break;
          }

          case 'DELETE_POLICY': {
            const { policyId } = op.data;
            const { error } = await supabase
              .from('policies')
              .delete()
              .eq('id', policyId)
              .eq('user_id', userId);
            if (error) throw error;
            syncedCount++;
            break;
          }

          case 'CREATE_PAYMENT': {
            const { payment } = op.data;
            payment.userId = userId;
            const row = mapPaymentToRow(payment);
            const { error } = await supabase.from('payments').upsert(row);
            if (error) throw error;
            syncedCount++;
            break;
          }

          case 'MARK_PAID': {
            const { paymentId, paidDate, paidAmount, policyId } = op.data;
            const { error } = await supabase
              .from('payments')
              .update({
                status: PAYMENT_STATUSES.PAID,
                paid_date: paidDate,
                paid_amount: paidAmount,
                updated_at: new Date().toISOString(),
              })
              .eq('id', paymentId)
              .eq('user_id', userId);
            if (error) throw error;

            if (policyId) {
              // Update policy next due date if possible
              const { data: unpaidPayments } = await supabase
                .from('payments')
                .select('due_date')
                .eq('policy_id', policyId)
                .neq('status', PAYMENT_STATUSES.PAID)
                .order('due_date', { ascending: true })
                .limit(1);

              if (unpaidPayments && unpaidPayments.length > 0) {
                await supabase
                  .from('policies')
                  .update({ next_due_date: unpaidPayments[0].due_date })
                  .eq('id', policyId);
              }
            }
            syncedCount++;
            break;
          }

          case 'DELETE_PAYMENT': {
            const { paymentId } = op.data;
            const { error } = await supabase
              .from('payments')
              .delete()
              .eq('id', paymentId)
              .eq('user_id', userId);
            if (error) throw error;
            syncedCount++;
            break;
          }

          default:
            console.warn('[syncService] Unknown operation type:', op.type);
            break;
        }
      } catch (err) {
        console.error(`[syncService] Failed op ${op.type} (${op.id}):`, err);
        errors.push(`${op.type}: ${err.message || 'Sync failed'}`);
        op.retryCount = (op.retryCount || 0) + 1;
        // Keep in queue if retry under 5 attempts
        if (op.retryCount < 5) {
          remainingOps.push(op);
        }
      }
    }

    // Save remaining failed operations back
    const { STORAGE_KEYS } = await import('../utils/constants');
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(STORAGE_KEYS.PENDING_OPS, JSON.stringify(remainingOps));

    return {
      success: errors.length === 0,
      syncedCount,
      remainingCount: remainingOps.length,
      errors,
    };
  },

  /**
   * Refresh policies from Supabase and cache locally
   */
  async syncPolicies(userId) {
    if (!isSupabaseConfigured() || !userId) return [];
    try {
      const { data, error } = await supabase
        .from('policies')
        .select('*')
        .eq('user_id', userId)
        .order('next_due_date', { ascending: true });

      if (error) throw error;

      const policies = (data || []).map(mapRowToPolicy);
      await localStorage.setCachedPolicies(policies);
      return policies;
    } catch (err) {
      console.warn('[syncService] syncPolicies error:', err);
      return localStorage.getCachedPolicies();
    }
  },

  /**
   * Refresh payments from Supabase and cache locally
   */
  async syncPayments(userId) {
    if (!isSupabaseConfigured() || !userId) return [];
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          policies:policy_id (
            policy_name,
            company_name
          )
        `)
        .eq('user_id', userId)
        .order('due_date', { ascending: true });

      if (error) throw error;

      const payments = (data || []).map(mapRowToPayment);
      await localStorage.setCachedPayments(payments);
      return payments;
    } catch (err) {
      console.warn('[syncService] syncPayments error:', err);
      return localStorage.getCachedPayments();
    }
  },

  /**
   * Master sync function: syncs pending operations, then pulls fresh data
   */
  async syncAll(userId) {
    if (isSyncInProgress || !userId || !isSupabaseConfigured()) {
      return { inProgress: true };
    }

    isSyncInProgress = true;
    try {
      // 1. Push pending local changes to Supabase
      const pushResult = await this.syncPendingOperations(userId);

      // 2. Pull remote fresh state
      const [policies, payments] = await Promise.all([
        this.syncPolicies(userId),
        this.syncPayments(userId),
      ]);

      // 3. Mark last sync time
      const now = new Date().toISOString();
      await localStorage.setLastSyncTime(now);

      return {
        success: true,
        lastSyncTime: now,
        policies,
        payments,
        pushedCount: pushResult.syncedCount,
      };
    } catch (err) {
      console.error('[syncService] syncAll failed:', err);
      return { success: false, error: err.message };
    } finally {
      isSyncInProgress = false;
    }
  },
};
