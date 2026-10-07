import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePolicies } from '../../context/PolicyContext';
import { Header } from '../../components/Header';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { PaymentCard } from '../../components/PaymentCard';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { formatCurrency, formatSumAssured } from '../../utils/currencyUtils';
import {
  formatDisplayDate,
  calculateRemainingDuration,
} from '../../utils/dateUtils';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { POLICY_STATUSES, PAYMENT_STATUSES } from '../../utils/constants';

export const PolicyDetailsScreen = ({ route, navigation }) => {
  const { policyId } = route.params || {};
  const { policies, payments, deletePolicy, markPaymentPaid } = usePolicies();

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [paying, setPaying] = useState(false);
  const [scheduleExpanded, setScheduleExpanded] = useState(false);

  const policy = policies.find((p) => p.id === policyId);

  // Policy payments sorted chronologically
  const policyPayments = payments
    .filter((p) => p.policyId === policyId)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Premium calculations: Total Paid vs Remaining to Pay
  const paidPayments = policyPayments.filter((p) => p.status === PAYMENT_STATUSES.PAID);
  const remainingPayments = policyPayments.filter((p) => p.status !== PAYMENT_STATUSES.PAID);

  const totalPremiumPaid = paidPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalPremiumRemaining = policyPayments.length > 0
    ? remainingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    : (() => {
        if (!policy) return 0;
        const years = parseInt(policy.durationYears, 10) || 1;
        const freq = (policy.paymentFrequency || '').toLowerCase();
        const perYear = freq === 'monthly' ? 12 : freq === 'quarterly' ? 4 : freq === 'half-yearly' ? 2 : 1;
        return (Number(policy.premiumAmount) || 0) * perYear * years;
      })();

  const totalExpectedPremium = totalPremiumPaid + totalPremiumRemaining;
  const percentPaid = totalExpectedPremium > 0
    ? Math.round((totalPremiumPaid / totalExpectedPremium) * 100)
    : 0;

  const remainingDurationText = policy ? calculateRemainingDuration(policy.endDate) : '';

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePolicy(policyId);
      setDeleteModalVisible(false);
      navigation.goBack();
    } catch (err) {
      console.warn('Delete policy error:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleMarkPaymentPaid = async () => {
    if (!selectedPayment) return;
    setPaying(true);
    try {
      await markPaymentPaid(selectedPayment.id);
      setPayModalVisible(false);
      setSelectedPayment(null);
    } catch (err) {
      console.warn('Mark paid error:', err);
    } finally {
      setPaying(false);
    }
  };

  if (!policy) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Policy Details" onBack={() => navigation.goBack()} />
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>Policy not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case POLICY_STATUSES.ACTIVE:
        return 'success';
      case POLICY_STATUSES.EXPIRED:
        return 'neutral';
      case POLICY_STATUSES.CANCELLED:
        return 'danger';
      case POLICY_STATUSES.MATURED:
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Policy Details"
        onBack={() => navigation.goBack()}
        rightIcon="create-outline"
        onRightPress={() => navigation.navigate('EditPolicy', { policyId: policy.id })}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Main Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Badge
              label={policy.policyType || 'Life Insurance'}
              variant="default"
              size="medium"
            />
            <Badge
              label={policy.status || 'Active'}
              variant={getStatusVariant(policy.status)}
              size="medium"
            />
          </View>

          <Text style={styles.policyTitle}>{policy.policyName}</Text>
          <Text style={styles.companyTitle}>
            {policy.companyName} {policy.policyNumber ? `• Policy #${policy.policyNumber}` : ''}
          </Text>

          <View style={styles.divider} />

          {/* Premium & Next Due Highlight */}
          <View style={styles.highlightRow}>
            <View>
              <Text style={styles.highlightLabel}>Recurring Premium</Text>
              <Text style={styles.premiumValue}>
                {formatCurrency(policy.premiumAmount)}
                <Text style={styles.freqText}> / {policy.paymentFrequency}</Text>
              </Text>
            </View>

            {policy.sumAssured ? (
              <View>
                <Text style={styles.highlightLabel}>Sum Assured</Text>
                <Text style={[styles.premiumValue, { color: colors.success }]}>
                  {formatSumAssured(policy.sumAssured)}
                </Text>
              </View>
            ) : null}

            <View style={styles.alignRight}>
              <Text style={styles.highlightLabel}>Next Due Date</Text>
              <Text style={styles.dueDateValue}>
                {formatDisplayDate(policy.nextDueDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Premium Payment Summary Widgets (Total Paid & Total Remaining) */}
        <View style={styles.summaryWidgetsRow}>
          {/* Total Premium Paid Widget */}
          <View style={[styles.summaryWidgetCard, styles.paidWidgetCard]}>
            <View style={styles.widgetHeader}>
              <View style={[styles.widgetIconBg, { backgroundColor: colors.successLight }]}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              </View>
              <Badge
                label={`${paidPayments.length} Paid`}
                variant="success"
                size="small"
              />
            </View>
            <Text style={styles.widgetTitle}>Total Premium Paid</Text>
            <Text
              style={[styles.widgetValue, styles.widgetValuePaid]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatCurrency(totalPremiumPaid)}
            </Text>
            <Text style={styles.widgetSubtext} numberOfLines={1}>
              {totalExpectedPremium > 0
                ? `${percentPaid}% completed`
                : '0 installments recorded'}
            </Text>
          </View>

          {/* Total Premium Remaining to Pay Widget */}
          <View style={[styles.summaryWidgetCard, styles.remainingWidgetCard]}>
            <View style={styles.widgetHeader}>
              <View style={[styles.widgetIconBg, { backgroundColor: colors.warningLight }]}>
                <Ionicons name="time" size={18} color={colors.warning} />
              </View>
              <Badge
                label={`${remainingPayments.length} Left`}
                variant="warning"
                size="small"
              />
            </View>
            <Text style={styles.widgetTitle}>Remaining to Pay</Text>
            <Text
              style={[styles.widgetValue, styles.widgetValueRemaining]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatCurrency(totalPremiumRemaining)}
            </Text>
            <Text style={styles.widgetSubtext} numberOfLines={1}>
              {totalExpectedPremium > 0
                ? `${100 - percentPaid}% remaining`
                : `${policy.durationYears || 1} yr duration`}
            </Text>
          </View>
        </View>

        {/* Term & Remaining Duration Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Policy Duration & Timeline</Text>

          <View style={styles.durationBanner}>
            <Ionicons name="time-outline" size={24} color={colors.primary} />
            <View style={styles.durationTextArea}>
              <Text style={styles.durationBannerLabel}>Remaining Duration</Text>
              <Text style={[styles.durationBannerValue, remainingDurationText === 'Policy expired' && styles.expiredText]}>
                {remainingDurationText}
              </Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Start Date</Text>
              <Text style={styles.gridValue}>{formatDisplayDate(policy.startDate)}</Text>
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>End Date</Text>
              <Text style={styles.gridValue}>{formatDisplayDate(policy.endDate)}</Text>
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Total Term</Text>
              <Text style={styles.gridValue}>
                {policy.durationYears} {policy.durationYears === 1 ? 'Year' : 'Years'}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Schedule & History Section (Collapsible by default) */}
        <View style={styles.paymentsSection}>
          <TouchableOpacity
            style={styles.scheduleHeaderToggle}
            onPress={() => setScheduleExpanded((prev) => !prev)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Installment Schedule (${policyPayments.length}), ${scheduleExpanded ? 'Tap to collapse' : 'Tap to expand'}`}
          >
            <View style={styles.scheduleHeaderLeft}>
              <Ionicons
                name="calendar-outline"
                size={22}
                color={colors.primary}
                style={styles.scheduleHeaderIcon}
              />
              <View style={styles.scheduleTitleCol}>
                <Text style={styles.sectionTitle}>
                  Installment Schedule ({policyPayments.length})
                </Text>
                <Text style={styles.scheduleHintText}>
                  {scheduleExpanded
                    ? 'Tap to collapse'
                    : `Tap to view ${policyPayments.length} installment${policyPayments.length === 1 ? '' : 's'}`}
                </Text>
              </View>
            </View>

            <View style={styles.scheduleToggleBadge}>
              <Text style={styles.scheduleToggleText}>
                {scheduleExpanded ? 'Hide' : 'View'}
              </Text>
              <Ionicons
                name={scheduleExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.primaryDark}
              />
            </View>
          </TouchableOpacity>

          {scheduleExpanded ? (
            <View style={styles.scheduleContent}>
              {policyPayments.length === 0 ? (
                <View style={styles.emptyPayments}>
                  <Text style={styles.emptyPaymentsText}>
                    No installments recorded for this policy.
                  </Text>
                </View>
              ) : (
                policyPayments.map((pmt) => (
                  <PaymentCard
                    key={pmt.id}
                    payment={pmt}
                    onMarkPaid={(p) => {
                      setSelectedPayment(p);
                      setPayModalVisible(true);
                    }}
                  />
                ))
              )}
            </View>
          ) : null}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <Button
            title="Edit Policy Details"
            variant="outline"
            onPress={() => navigation.navigate('EditPolicy', { policyId: policy.id })}
            icon={<Ionicons name="create-outline" size={18} color={colors.primary} />}
            style={styles.actionBtn}
          />

          <Button
            title="Delete Policy"
            variant="danger"
            onPress={() => setDeleteModalVisible(true)}
            icon={<Ionicons name="trash-outline" size={18} color={colors.textInverse} />}
            style={styles.actionBtn}
          />
        </View>
      </ScrollView>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={deleteModalVisible}
        title="Delete Policy?"
        message="Are you sure you want to delete this policy? This will permanently delete the policy and all associated payment installments."
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalVisible(false)}
      />

      {/* Mark Paid Confirmation Dialog */}
      <ConfirmDialog
        visible={payModalVisible}
        title="Mark as Paid"
        message={
          selectedPayment
            ? `Confirm receipt of ${formatCurrency(selectedPayment.amount)} for installment #${selectedPayment.installmentNumber || 1}?`
            : 'Mark payment as paid?'
        }
        confirmText="Confirm Paid"
        confirmVariant="primary"
        loading={paying}
        onConfirm={handleMarkPaymentPaid}
        onCancel={() => {
          setPayModalVisible(false);
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
  notFoundContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  notFoundText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  policyTitle: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  companyTitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  highlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  highlightLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  premiumValue: {
    ...typography.subtitle,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  freqText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  dueDateValue: {
    ...typography.subtitle,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryWidgetsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryWidgetCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  paidWidgetCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  remainingWidgetCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  widgetIconBg: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  widgetValue: {
    ...typography.h3,
    fontWeight: '700',
    marginTop: 4,
  },
  widgetValuePaid: {
    color: colors.success,
  },
  widgetValueRemaining: {
    color: colors.textPrimary,
  },
  widgetSubtext: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    ...typography.subtitle,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  durationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  durationTextArea: {
    flex: 1,
  },
  durationBannerLabel: {
    ...typography.captionBold,
    color: colors.primaryDark,
  },
  durationBannerValue: {
    ...typography.subtitle,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: 2,
  },
  expiredText: {
    color: colors.danger,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridItem: {
    flex: 1,
  },
  gridLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  gridValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  paymentsSection: {
    marginTop: spacing.md,
  },
  scheduleHeaderToggle: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  scheduleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  scheduleHeaderIcon: {
    marginRight: 2,
  },
  scheduleTitleCol: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  scheduleHintText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  scheduleToggleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  scheduleToggleText: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 12,
  },
  scheduleContent: {
    marginTop: spacing.sm,
  },
  emptyPayments: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyPaymentsText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  actionsSection: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  actionBtn: {
    marginBottom: spacing.xs,
  },
});
