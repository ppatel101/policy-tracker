import { useMemo } from 'react';
import { usePolicies } from '../context/PolicyContext';
import { PAYMENT_STATUSES } from '../utils/constants';

export function usePayments(policyId = null) {
  const { payments, markPaymentPaid, loading, refreshing } = usePolicies();

  const filteredPayments = useMemo(() => {
    if (!policyId) return payments;
    return payments.filter((p) => p.policyId === policyId);
  }, [payments, policyId]);

  const upcomingPayments = useMemo(() => {
    return filteredPayments
      .filter((p) => p.status !== PAYMENT_STATUSES.PAID)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [filteredPayments]);

  const paidPayments = useMemo(() => {
    return filteredPayments
      .filter((p) => p.status === PAYMENT_STATUSES.PAID)
      .sort((a, b) => new Date(b.paidDate || b.dueDate).getTime() - new Date(a.paidDate || a.dueDate).getTime());
  }, [filteredPayments]);

  return {
    payments: filteredPayments,
    upcomingPayments,
    paidPayments,
    markPaymentPaid,
    loading,
    refreshing,
  };
}
