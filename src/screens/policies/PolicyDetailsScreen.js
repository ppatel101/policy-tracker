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
import { formatCurrency } from '../../utils/currencyUtils';
import {
  formatDisplayDate,
  calculateRemainingDuration,
} from '../../utils/dateUtils';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { POLICY_STATUSES } from '../../utils/constants';

export const PolicyDetailsScreen = ({ route, navigation }) => {
  const { policyId } = route.params || {};
  const { policies, payments, deletePolicy, markPaymentPaid } = usePolicies();

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [paying, setPaying] = useState(false);

  const policy = policies.find((p) => p.id === policyId);

  // Policy payments sorted chronologically
  const policyPayments = payments
    .filter((p) => p.policyId === policyId)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

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

            <View style={styles.alignRight}>
              <Text style={styles.highlightLabel}>Next Due Date</Text>
              <Text style={styles.dueDateValue}>
                {formatDisplayDate(policy.nextDueDate)}
              </Text>
            </View>
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

        {/* Payment Schedule & History Section */}
        <View style={styles.paymentsSection}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>
              Installment Schedule ({policyPayments.length})
            </Text>
          </View>

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
    ...typography.h2,
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
  sectionTitleRow: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
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
