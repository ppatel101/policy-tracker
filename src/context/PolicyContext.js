import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { policyService } from '../services/policyService';
import { paymentService } from '../services/paymentService';
import { syncService } from '../services/syncService';
import { notificationService } from '../services/notificationService';
import { localStorage } from '../storage/localStorage';
import { useAuth } from './AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { POLICY_STATUSES, PAYMENT_STATUSES } from '../utils/constants';

const PolicyContext = createContext(null);

export const PolicyProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { isOnline } = useNetworkStatus();

  const [policies, setPolicies] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [error, setError] = useState(null);

  // Load initial cached data and fetch remote data
  const loadData = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const userId = user?.id || null;

      // 1. First populate from cache for instant response
      if (!isPullToRefresh) {
        const [cachedPolicies, cachedPayments, cachedSyncTime] = await Promise.all([
          localStorage.getCachedPolicies(),
          localStorage.getCachedPayments(),
          localStorage.getLastSyncTime(),
        ]);
        if (cachedPolicies.length > 0 || cachedPayments.length > 0) {
          setPolicies(cachedPolicies);
          setPayments(cachedPayments);
          setLastSyncTime(cachedSyncTime);
          setLoading(false);
        }
      }

      // 2. If authenticated and online, fetch fresh data and sync
      if (userId && isOnline) {
        // Run sync of any pending offline operations first
        await syncService.syncPendingOperations(userId);

        const [polResult, payResult] = await Promise.all([
          policyService.getPolicies(userId),
          paymentService.getPayments(userId),
        ]);

        if (polResult.policies) setPolicies(polResult.policies);
        if (payResult.payments) setPayments(payResult.payments);

        const now = new Date().toISOString();
        await localStorage.setLastSyncTime(now);
        setLastSyncTime(now);

        // Schedule notification reminders in background
        const settings = await localStorage.getSettings();
        if (settings.notificationsEnabled) {
          notificationService.scheduleAllReminders(payResult.payments, polResult.policies, settings);
        }
      } else {
        // Just ensure state has the local cached data
        const [cPolicies, cPayments, cSync] = await Promise.all([
          localStorage.getCachedPolicies(),
          localStorage.getCachedPayments(),
          localStorage.getLastSyncTime(),
        ]);
        setPolicies(cPolicies);
        setPayments(cPayments);
        setLastSyncTime(cSync);
      }
    } catch (err) {
      console.warn('[PolicyContext] loadData error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isOnline]);

  // Load data on user change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // When connection comes back online, trigger auto-sync
  useEffect(() => {
    if (isOnline && user?.id) {
      syncService.syncAll(user.id).then((result) => {
        if (result.success) {
          if (result.policies) setPolicies(result.policies);
          if (result.payments) setPayments(result.payments);
          if (result.lastSyncTime) setLastSyncTime(result.lastSyncTime);
        }
      });
    }
  }, [isOnline, user?.id]);

  // Add Policy Action
  const addPolicy = useCallback(async (policyInput) => {
    const userId = user?.id || 'local_user';
    const result = await policyService.createPolicy(policyInput, userId);

    if (result.policy) {
      setPolicies((prev) => [result.policy, ...prev.filter((p) => p.id !== result.policy.id)]);
      if (result.schedule && result.schedule.length > 0) {
        setPayments((prev) => [...result.schedule, ...prev]);

        // Schedule notification
        const settings = await localStorage.getSettings();
        if (settings.notificationsEnabled) {
          result.schedule.forEach((pmt) => {
            notificationService.schedulePaymentReminder(pmt, result.policy, settings);
          });
        }
      }
    }

    return result;
  }, [user]);

  // Update Policy Action
  const updatePolicy = useCallback(async (policyId, updates) => {
    const userId = user?.id || 'local_user';
    const result = await policyService.updatePolicy(policyId, updates, userId);

    if (result.policy) {
      setPolicies((prev) => prev.map((p) => (p.id === policyId ? result.policy : p)));
    }

    return result;
  }, [user]);

  // Delete Policy Action
  const deletePolicy = useCallback(async (policyId) => {
    const userId = user?.id || 'local_user';
    const result = await policyService.deletePolicy(policyId, userId);

    if (result.success) {
      setPolicies((prev) => prev.filter((p) => p.id !== policyId));
      setPayments((prev) => prev.filter((p) => p.policyId !== policyId));
    }

    return result;
  }, [user]);

  // Mark Payment as Paid Action
  const markPaymentPaid = useCallback(async (paymentId, amountPaid = null, paidDate = null) => {
    const userId = user?.id || 'local_user';
    const result = await paymentService.markPaymentAsPaid(paymentId, userId, amountPaid, paidDate);

    if (result.payment) {
      // Update payment state
      setPayments((prev) => prev.map((p) => (p.id === paymentId ? result.payment : p)));

      // Update policy state if next due date changed
      if (result.policy) {
        setPolicies((prev) => prev.map((p) => (p.id === result.policy.id ? result.policy : p)));
      }

      // Cancel local notification reminder
      notificationService.cancelPaymentReminder(paymentId);
    }

    return result;
  }, [user]);

  // Manual trigger for sync
  const manualSync = useCallback(async () => {
    if (!user?.id || syncing) return;
    setSyncing(true);
    try {
      const res = await syncService.syncAll(user.id);
      if (res.success) {
        if (res.policies) setPolicies(res.policies);
        if (res.payments) setPayments(res.payments);
        if (res.lastSyncTime) setLastSyncTime(res.lastSyncTime);
      }
      return res;
    } finally {
      setSyncing(false);
    }
  }, [user?.id, syncing]);

  // Dashboard Stats Calculations (Section 18)
  const stats = useMemo(() => {
    const currentYear = new Date().getFullYear();

    const totalPolicies = policies.length;
    const activePolicies = policies.filter((p) => p.status === POLICY_STATUSES.ACTIVE).length;

    const unpaidPayments = payments.filter((p) => p.status !== PAYMENT_STATUSES.PAID);
    const upcomingPaymentsCount = unpaidPayments.length;

    // Total premium due across all unpaid upcoming payments
    const totalPremiumDue = unpaidPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Paid this calendar year
    const paidThisYear = payments
      .filter((p) => {
        if (p.status !== PAYMENT_STATUSES.PAID || !p.paidDate) return false;
        const paidYear = new Date(p.paidDate).getFullYear();
        return paidYear === currentYear;
      })
      .reduce((sum, p) => sum + (Number(p.paidAmount || p.amount) || 0), 0);

    return {
      totalPolicies,
      activePolicies,
      upcomingPaymentsCount,
      totalPremiumDue,
      paidThisYear,
    };
  }, [policies, payments]);

  // Upcoming Payments list for dashboard (sorted due_date ASC)
  const upcomingPayments = useMemo(() => {
    const policyMap = new Map(policies.map((p) => [p.id, p]));
    return payments
      .filter((p) => p && p.status !== PAYMENT_STATUSES.PAID)
      .map((p) => {
        const policy = policyMap.get(p.policyId);
        return {
          ...p,
          policyName: policy ? policy.policyName : (p.policyName || 'Policy'),
          companyName: policy ? policy.companyName : (p.companyName || ''),
        };
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [payments, policies]);

  const value = {
    policies,
    payments,
    loading,
    refreshing,
    syncing,
    lastSyncTime,
    error,
    stats,
    upcomingPayments,
    loadData,
    addPolicy,
    updatePolicy,
    deletePolicy,
    markPaymentPaid,
    manualSync,
  };

  return <PolicyContext.Provider value={value}>{children}</PolicyContext.Provider>;
};

export const usePolicies = () => {
  const context = useContext(PolicyContext);
  if (!context) {
    throw new Error('usePolicies must be used within a PolicyProvider');
  }
  return context;
};
