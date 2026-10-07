import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { Badge } from './Badge';
import { formatCurrency, formatSumAssured } from '../utils/currencyUtils';
import { formatDisplayDate, calculateRemainingDuration } from '../utils/dateUtils';
import { POLICY_STATUSES, getCoverageShortLabel } from '../utils/constants';

export const PolicyCard = ({ policy, onPress, style }) => {
  if (!policy) return null;

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

  const remainingDurationText = calculateRemainingDuration(policy.endDate);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.card, style]}
      accessibilityRole="button"
      accessibilityLabel={`Policy ${policy.policyName} by ${policy.companyName}`}
    >
      <View style={styles.topRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.policyName} numberOfLines={1}>
            {policy.policyName}
          </Text>
          <Text style={styles.companyName} numberOfLines={1}>
            {policy.companyName} {policy.policyNumber ? `• #${policy.policyNumber}` : ''}
          </Text>
        </View>

        <Badge
          label={policy.status || 'Active'}
          variant={getStatusVariant(policy.status)}
          size="small"
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Premium</Text>
          <Text style={styles.premiumValue}>
            {formatCurrency(policy.premiumAmount)}
            <Text style={styles.freqText}> / {policy.paymentFrequency || 'yr'}</Text>
          </Text>
        </View>

        {policy.sumAssured ? (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{getCoverageShortLabel(policy.policyType)}</Text>
            <Text style={[styles.detailValue, styles.sumAssuredValue]}>
              {formatSumAssured(policy.sumAssured)}
            </Text>
          </View>
        ) : null}

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Next Due</Text>
          <Text style={styles.detailValue}>
            {formatDisplayDate(policy.nextDueDate)}
          </Text>
        </View>

        {!policy.sumAssured && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={[styles.detailValue, remainingDurationText === 'Policy expired' && styles.expiredText]} numberOfLines={1}>
              {remainingDurationText}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footerRow}>
        <View style={styles.tagBadge}>
          <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
          <Text style={styles.tagText}>{policy.policyType || 'Life Insurance'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  policyName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  companyName: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
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
  detailValue: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 13,
  },
  sumAssuredValue: {
    color: colors.success,
    fontWeight: '700',
  },
  expiredText: {
    color: colors.danger,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.xs,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  tagText: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 11,
  },
});
