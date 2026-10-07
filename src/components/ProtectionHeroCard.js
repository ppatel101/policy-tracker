import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, formatSumAssuredParts } from '../utils/currencyUtils';

export const ProtectionHeroCard = ({
  title = 'TOTAL SUM ASSURED',
  subtitle,
  sumAssured = 0,
  financialYearLabel = 'FY 2026–27',
  paidAmount = 0,
  pendingAmount = 0,
  percentPaid = 0,
  badgeText = '100% Protected',
  badgeIcon = 'shield',
  showBadge = true,
  onPress,
  width,
  style,
}) => {
  const parts = formatSumAssuredParts(sumAssured);
  const clampedPercent = Math.min(100, Math.max(0, Math.round(percentPaid || 0)));

  const ContainerComponent = onPress ? TouchableOpacity : View;

  return (
    <ContainerComponent
      activeOpacity={onPress ? 0.9 : 1}
      onPress={onPress}
      style={[
        styles.card,
        width && width > 0 ? { width, maxWidth: width } : null,
        style,
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`${title}: ${parts.fullText}`}
    >
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.titleArea}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {showBadge && (
          <View style={styles.badge}>
            <Ionicons name={badgeIcon || 'shield'} size={13} color="#34D399" />
            <Text style={styles.badgeText}>{badgeText || '100% Protected'}</Text>
          </View>
        )}
      </View>

      {/* Primary Stat: ₹12.5 Lakhs */}
      <View style={styles.statContainer}>
        <Text style={styles.statSymbol}>{parts.symbol || '₹'} </Text>
        <Text style={styles.statValue}>{parts.value}</Text>
        {parts.unit ? <Text style={styles.statUnit}> {parts.unit}</Text> : null}
      </View>

      {/* Inner Card: FY 2026–27 Premium Progress */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeaderRow}>
          <Text style={styles.progressTitle}>
            {financialYearLabel} Premium Progress
          </Text>
          <Text style={styles.progressPercent}>{clampedPercent}% Paid</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${clampedPercent}%` },
            ]}
          />
        </View>

        {/* Breakdown Row: Paid & Pending */}
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownItem}>
            <View style={[styles.dot, styles.paidDot]} />
            <Text style={styles.breakdownText}>
              Paid: <Text style={styles.breakdownBold}>{formatCurrency(paidAmount)}</Text>
            </Text>
          </View>

          <View style={styles.breakdownItem}>
            <View style={[styles.dot, styles.pendingDot]} />
            <Text style={styles.breakdownText}>
              Pending: <Text style={styles.breakdownBold}>{formatCurrency(pendingAmount)}</Text>
            </Text>
          </View>
        </View>
      </View>
    </ContainerComponent>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1242BD', // Vibrant royal blue from reference image
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#0E3498',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleArea: {
    flex: 1,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(224, 231, 255, 0.85)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  statContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
    marginBottom: 16,
  },
  statSymbol: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statValue: {
    fontSize: 35,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  statUnit: {
    fontSize: 22,
    fontWeight: '600',
    color: '#C7D2FE', // Pastel lavender blue
  },
  progressCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.32)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  progressTitle: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#CBD5E1',
  },
  progressPercent: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 9,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34D399', // Mint emerald green
    borderRadius: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  paidDot: {
    backgroundColor: '#34D399',
  },
  pendingDot: {
    backgroundColor: '#A5B4FC',
  },
  breakdownText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  breakdownBold: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
