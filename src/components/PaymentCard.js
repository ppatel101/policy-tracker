import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { Badge } from './Badge';
import { formatCurrency } from '../utils/currencyUtils';
import { formatDisplayDate, getDueStatus, getDueText, isCurrentYearPremium } from '../utils/dateUtils';
import { PAYMENT_STATUSES } from '../utils/constants';

export const PaymentCard = ({
  payment,
  onMarkPaid,
  onPress,
  compact = false,
  style,
}) => {
  if (!payment) return null;

  const dueStatus = getDueStatus(payment.dueDate, payment.status);
  const dueText = getDueText(payment.dueDate, payment.status);

  const getStatusBadgeVariant = () => {
    switch (dueStatus) {
      case PAYMENT_STATUSES.PAID:
        return 'success';
      case PAYMENT_STATUSES.OVERDUE:
        return 'danger';
      case PAYMENT_STATUSES.DUE_TODAY:
      case PAYMENT_STATUSES.DUE_SOON:
        return 'warning';
      case PAYMENT_STATUSES.UPCOMING:
      default:
        return 'info';
    }
  };

  const isPaid = payment.status === PAYMENT_STATUSES.PAID;
  const isCurrentYear = isCurrentYearPremium(payment.dueDate);
  const canMarkPaid = Boolean(onMarkPaid && !isPaid && isCurrentYear);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.card, isPaid && styles.paidCard, style]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleArea}>
          <Text style={styles.policyName} numberOfLines={1}>
            {payment.policyName || 'Insurance Premium'}
          </Text>
          {payment.companyName ? (
            <Text style={styles.companyName} numberOfLines={1}>
              {payment.companyName}
            </Text>
          ) : null}
        </View>

        <Badge
          label={isPaid ? 'Paid' : dueText}
          variant={getStatusBadgeVariant()}
          size="small"
        />
      </View>

      <View style={styles.contentRow}>
        <View>
          <Text style={styles.amountLabel}>{isPaid ? 'Paid Amount' : 'Amount Due'}</Text>
          <Text style={[styles.amountText, isPaid && styles.paidAmountText]}>
            {formatCurrency(payment.paidAmount || payment.amount)}
          </Text>
        </View>

        <View style={styles.dateArea}>
          <Text style={styles.dateLabel}>{isPaid ? 'Paid Date' : 'Due Date'}</Text>
          <Text style={styles.dateValue}>
            {formatDisplayDate(isPaid ? payment.paidDate : payment.dueDate)}
          </Text>
        </View>
      </View>

      {!compact && (
        <View style={styles.actionRow}>
          {isPaid ? (
            <View style={styles.paidConfirmedRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.paidConfirmedText}>
                Paid on {formatDisplayDate(payment.paidDate || payment.dueDate)}
              </Text>
            </View>
          ) : canMarkPaid ? (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => onMarkPaid && onMarkPaid(payment)}
              style={styles.markPaidBtn}
              accessibilityRole="button"
              accessibilityLabel={`Mark payment of ${formatCurrency(payment.amount)} as paid`}
            >
              <Ionicons name="checkmark-done" size={16} color={colors.success} />
              <Text style={styles.markPaidBtnText}>Mark as Paid</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.futureBadge}>
              <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.futureBadgeText}>Future Installment</Text>
            </View>
          )}

          {payment.installmentNumber ? (
            <Text style={styles.installmentText}>
              Installment #{payment.installmentNumber}
            </Text>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  paidCard: {
    backgroundColor: '#FAFDFB',
    borderColor: '#E8F5E9',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleArea: {
    flex: 1,
    marginRight: spacing.sm,
  },
  policyName: {
    ...typography.subtitle,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  companyName: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: spacing.xs,
  },
  amountLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  amountText: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  paidAmountText: {
    color: colors.success,
  },
  dateArea: {
    alignItems: 'flex-end',
  },
  dateLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  dateValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  markPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  markPaidBtnText: {
    ...typography.captionBold,
    color: '#065F46', // Dark emerald
    fontSize: 11,
  },
  paidConfirmedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paidConfirmedText: {
    ...typography.captionBold,
    color: colors.success,
  },
  installmentText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  futureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    gap: 5,
  },
  futureBadgeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '500',
  },
});
