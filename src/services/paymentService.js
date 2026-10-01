import { supabase, formatSupabaseError, isSupabaseConfigured } from './supabase';
import { localStorage } from '../storage/localStorage';
import { mapRowToPayment, mapPaymentToRow, createPaymentModel } from '../models/payment';
import { formatDate, calculateNextDueDateFromPayments } from '../utils/dateUtils';
import { generateUUID } from '../utils/uuid';
import { PAYMENT_STATUSES } from '../utils/constants';

export const paymentService = {
  /**
   * Fetch all payments for user with joined policy details
   */
  async getPayments(userId) {
    if (!userId) {
      return { payments: await localStorage.getCachedPayments(), fromCache: true, error: null };
    }

    try {
      if (isSupabaseConfigured()) {
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
        return { payments, fromCache: false, error: null };
      }
    } catch (err) {
      console.warn('[paymentService] Fetch failed, fallback to cache:', err);
      const cached = await localStorage.getCachedPayments();
      return {
        payments: cached,
        fromCache: true,
        error: formatSupabaseError(err, 'Unable to load payments from server. Showing cached data.'),
      };
    }

    const cached = await localStorage.getCachedPayments();
    return { payments: cached, fromCache: true, error: null };
  },

  /**
   * Get upcoming payments for the dashboard
   * Sorted by due_date ASC, unpaid only
   */
  async getUpcomingPayments(userId, limit = 5) {
    const { payments } = await this.getPayments(userId);
    const unpaid = payments
      .filter((p) => p && p.status !== PAYMENT_STATUSES.PAID)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return unpaid.slice(0, limit);
  },

  /**
   * Get payment history (sorted newest first, with filtering)
   */
  async getPaymentHistory(userId, filter = 'all') {
    const { payments } = await this.getPayments(userId);

    let filtered = payments;
    if (filter === 'paid') {
      filtered = payments.filter((p) => p.status === PAYMENT_STATUSES.PAID);
    } else if (filter === 'upcoming') {
      filtered = payments.filter((p) => p.status !== PAYMENT_STATUSES.PAID);
    } else if (filter === 'overdue') {
      const today = new Date().toISOString().split('T')[0];
      filtered = payments.filter((p) => p.status !== PAYMENT_STATUSES.PAID && p.dueDate < today);
    }

    // Sort newest first
    return filtered.sort((a, b) => {
      const dateA = a.paidDate || a.dueDate;
      const dateB = b.paidDate || b.dueDate;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  },

  /**
   * Mark a payment as paid, and update policy's next due date!
   */
  async markPaymentAsPaid(paymentId, userId, amountPaid = null, paidDate = null) {
    const today = formatDate(paidDate || new Date());
    const cachedPayments = await localStorage.getCachedPayments();
    const payment = cachedPayments.find((p) => p.id === paymentId);

    const actualAmount = amountPaid !== null && amountPaid !== undefined
      ? Number(amountPaid)
      : (payment ? Number(payment.amount) : 0);

    const updatedPayment = {
      ...(payment || {}),
      id: paymentId,
      userId,
      status: PAYMENT_STATUSES.PAID,
      paidDate: today,
      paidAmount: actualAmount,
      updatedAt: new Date().toISOString(),
    };

    let savedRemotely = false;
    let remoteError = null;

    if (isSupabaseConfigured() && userId) {
      try {
        const { error } = await supabase
          .from('payments')
          .update({
            status: PAYMENT_STATUSES.PAID,
            paid_date: today,
            paid_amount: actualAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', paymentId)
          .eq('user_id', userId);

        if (error) throw error;
        savedRemotely = true;
      } catch (err) {
        console.warn('[paymentService] markPaymentAsPaid remote error:', err);
        remoteError = formatSupabaseError(err, 'Failed to update payment on server. Saved locally.');
      }
    }

    // Update payments cache
    const newPayments = cachedPayments.map((p) => (p.id === paymentId ? updatedPayment : p));
    await localStorage.setCachedPayments(newPayments);

    // Recalculate policy's next due date (Section 56 & 57)
    let updatedPolicy = null;
    if (payment?.policyId) {
      const policyId = payment.policyId;
      const policyPayments = newPayments.filter((p) => p.policyId === policyId);
      const nextDueDate = calculateNextDueDateFromPayments(policyPayments);

      const cachedPolicies = await localStorage.getCachedPolicies();
      const existingPolicy = cachedPolicies.find((p) => p.id === policyId);

      if (existingPolicy) {
        updatedPolicy = {
          ...existingPolicy,
          nextDueDate: nextDueDate || existingPolicy.nextDueDate,
          updatedAt: new Date().toISOString(),
        };

        const newPolicies = cachedPolicies.map((p) => (p.id === policyId ? updatedPolicy : p));
        await localStorage.setCachedPolicies(newPolicies);

        // Update policy remotely if online
        if (isSupabaseConfigured() && userId && nextDueDate) {
          try {
            await supabase
              .from('policies')
              .update({ next_due_date: nextDueDate, updated_at: new Date().toISOString() })
              .eq('id', policyId)
              .eq('user_id', userId);
          } catch (pErr) {
            console.warn('[paymentService] Policy next_due_date update warning:', pErr);
          }
        }
      }
    }

    if (!savedRemotely) {
      await localStorage.addPendingSyncOperation({
        id: 'sync_payment_paid_' + paymentId,
        type: 'MARK_PAID',
        entity: 'payment',
        data: {
          paymentId,
          paidDate: today,
          paidAmount: actualAmount,
          policyId: payment?.policyId,
        },
      });
    }

    return { payment: updatedPayment, policy: updatedPolicy, savedRemotely, error: remoteError };
  },

  /**
   * Create an ad-hoc payment
   */
  async createPayment(paymentInput, userId) {
    const paymentId = paymentInput.id || generateUUID();
    const payment = createPaymentModel({
      ...paymentInput,
      id: paymentId,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    let savedRemotely = false;
    let remoteError = null;

    if (isSupabaseConfigured() && userId) {
      try {
        const row = mapPaymentToRow(payment);
        const { error } = await supabase.from('payments').insert(row);
        if (error) throw error;
        savedRemotely = true;
      } catch (err) {
        console.warn('[paymentService] createPayment remote error:', err);
        remoteError = formatSupabaseError(err, 'Failed to save payment on server. Saved locally.');
      }
    }

    const cached = await localStorage.getCachedPayments();
    await localStorage.setCachedPayments([payment, ...cached]);

    if (!savedRemotely) {
      await localStorage.addPendingSyncOperation({
        id: 'sync_payment_create_' + paymentId,
        type: 'CREATE_PAYMENT',
        entity: 'payment',
        data: { payment },
      });
    }

    return { payment, savedRemotely, error: remoteError };
  },

  /**
   * Delete a payment
   */
  async deletePayment(paymentId, userId) {
    let deletedRemotely = false;
    let remoteError = null;

    if (isSupabaseConfigured() && userId) {
      try {
        const { error } = await supabase
          .from('payments')
          .delete()
          .eq('id', paymentId)
          .eq('user_id', userId);

        if (error) throw error;
        deletedRemotely = true;
      } catch (err) {
        console.warn('[paymentService] deletePayment remote error:', err);
        remoteError = formatSupabaseError(err, 'Failed to delete on server. Deleted locally.');
      }
    }

    const cached = await localStorage.getCachedPayments();
    await localStorage.setCachedPayments(cached.filter((p) => p.id !== paymentId));

    if (!deletedRemotely) {
      await localStorage.addPendingSyncOperation({
        id: 'sync_payment_delete_' + paymentId,
        type: 'DELETE_PAYMENT',
        entity: 'payment',
        data: { paymentId },
      });
    }

    return { success: true, deletedRemotely, error: remoteError };
  },
};
