import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { usePolicies } from '../../context/PolicyContext';
import { StatCard } from '../../components/StatCard';
import { PaymentCard } from '../../components/PaymentCard';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { OfflineBanner } from '../../components/OfflineBanner';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatCurrency } from '../../utils/currencyUtils';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

export const DashboardScreen = ({ navigation }) => {
  const { user, profile } = useAuth();
  const {
    policies,
    upcomingPayments,
    stats,
    loading,
    refreshing,
    syncing,
    loadData,
    markPaymentPaid,
    manualSync,
  } = usePolicies();

  const [selectedPayment, setSelectedPayment] = useState(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const handleOpenMarkPaid = (payment) => {
    setSelectedPayment(payment);
    setConfirmModalVisible(true);
  };

  const handleConfirmMarkPaid = async () => {
    if (!selectedPayment) return;
    setMarkingPaid(true);
    try {
      await markPaymentPaid(selectedPayment.id);
      setConfirmModalVisible(false);
      setSelectedPayment(null);
    } catch (err) {
      console.warn('Mark paid error:', err);
    } finally {
      setMarkingPaid(false);
    }
  };

  const userName = profile?.fullName || user?.user_metadata?.full_name || 'Policyholder';

  if (loading && policies.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <OfflineBanner />
        <LoadingSpinner fullScreen message="Loading dashboard..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <OfflineBanner />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.greetingArea}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {userName}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={manualSync}
              disabled={syncing}
              style={styles.syncBtn}
              accessibilityRole="button"
              accessibilityLabel="Sync data"
            >
              <Ionicons
                name="sync-outline"
                size={20}
                color={colors.primary}
                style={syncing && styles.syncingIcon}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('AddPolicy')}
              style={styles.addBtn}
              accessibilityRole="button"
              accessibilityLabel="Add new policy"
            >
              <Ionicons name="add" size={22} color={colors.textInverse} />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Financial Overview / Stats Cards (Section 18) */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Overview</Text>

          {/* Row 1: Total Policies & Active */}
          <View style={styles.statsRow}>
            <StatCard
              title="Total Policies"
              value={stats.totalPolicies}
              subtitle={`${stats.activePolicies} active`}
              icon={<Ionicons name="shield-checkmark" size={18} color={colors.primary} />}
              iconBgColor={colors.primaryLight}
              onPress={() => navigation.navigate('PoliciesTab')}
            />
            <StatCard
              title="Upcoming Dues"
              value={stats.upcomingPaymentsCount}
              subtitle="Pending payments"
              icon={<Ionicons name="calendar-outline" size={18} color={colors.warning} />}
              iconBgColor={colors.warningLight}
              onPress={() => navigation.navigate('PaymentsTab')}
            />
          </View>

          {/* Row 2: Premium Due & Paid This Year */}
          <View style={styles.statsRow}>
            <StatCard
              title="Total Due"
              value={formatCurrency(stats.totalPremiumDue)}
              subtitle="Across all policies"
              icon={<Ionicons name="cash-outline" size={18} color={colors.danger} />}
              iconBgColor={colors.dangerLight}
            />
            <StatCard
              title="Paid This Year"
              value={formatCurrency(stats.paidThisYear)}
              subtitle={`${new Date().getFullYear()} contributions`}
              icon={<Ionicons name="checkmark-done" size={18} color={colors.success} />}
              iconBgColor={colors.successLight}
            />
          </View>
        </View>

        {/* Upcoming Payments Section (Sections 19, 20, 21) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Upcoming Payments</Text>
          {upcomingPayments.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('PaymentsTab')}
            >
              <Text style={styles.seeAllText}>View All ({upcomingPayments.length})</Text>
            </TouchableOpacity>
          )}
        </View>

        {upcomingPayments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="calendar-outline"
              title="No upcoming payments"
              description="You have no pending premiums due at this time."
              buttonTitle={policies.length === 0 ? 'Add Your First Policy' : null}
              onButtonPress={() => navigation.navigate('AddPolicy')}
            />
          </View>
        ) : (
          <View style={styles.paymentsList}>
            {upcomingPayments.slice(0, 5).map((payment) => (
              <PaymentCard
                key={payment.id}
                payment={payment}
                onMarkPaid={handleOpenMarkPaid}
                onPress={() => {
                  if (payment.policyId) {
                    navigation.navigate('PolicyDetails', { policyId: payment.policyId });
                  }
                }}
              />
            ))}
          </View>
        )}

        {/* Quick Add Banner if no policies */}
        {policies.length === 0 && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('AddPolicy')}
            style={styles.addPolicyBanner}
          >
            <View style={styles.bannerIconCircle}>
              <Ionicons name="shield-outline" size={26} color={colors.primary} />
            </View>
            <View style={styles.bannerTextArea}>
              <Text style={styles.bannerTitle}>Track an Insurance Policy</Text>
              <Text style={styles.bannerSubtitle}>
                Add life, health, vehicle, or term insurance to schedule reminders.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Confirmation Dialog for Mark as Paid (Section 21) */}
      <ConfirmDialog
        visible={confirmModalVisible}
        title="Mark Payment as Paid"
        message={
          selectedPayment
            ? `Mark this installment of ${formatCurrency(selectedPayment.amount)} for ${selectedPayment.policyName || 'this policy'} as paid today?`
            : 'Mark this payment as paid?'
        }
        confirmText="Yes, Mark Paid"
        confirmVariant="primary"
        loading={markingPaid}
        onConfirm={handleConfirmMarkPaid}
        onCancel={() => {
          setConfirmModalVisible(false);
          setSelectedPayment(null);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  greetingArea: {
    flex: 1,
    marginRight: spacing.md,
  },
  greeting: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userName: {
    ...typography.h1,
    color: colors.textPrimary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  syncBtn: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncingIcon: {
    opacity: 0.6,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    height: 42,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  addBtnText: {
    ...typography.bodyBold,
    color: colors.textInverse,
  },
  statsSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  seeAllText: {
    ...typography.bodyBold,
    color: colors.primary,
    fontSize: 13,
  },
  paymentsList: {
    marginBottom: spacing.lg,
  },
  emptyContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  addPolicyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.md,
  },
  bannerIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextArea: {
    flex: 1,
  },
  bannerTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  bannerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
