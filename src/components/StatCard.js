import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  iconBgColor = colors.primaryLight,
  onPress,
  style,
  compact = true,
}) => {
  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.card, compact ? styles.cardCompact : null, style]}
      accessibilityRole={onPress ? 'button' : 'summary'}
    >
      <View style={[styles.headerRow, compact ? styles.headerRowCompact : null]}>
        <Text style={[styles.title, compact ? styles.titleCompact : null]} numberOfLines={1}>
          {title}
        </Text>
        {icon && (
          <View
            style={[
              styles.iconContainer,
              compact ? styles.iconContainerCompact : null,
              { backgroundColor: iconBgColor },
            ]}
          >
            {icon}
          </View>
        )}
      </View>

      <Text style={[styles.value, compact ? styles.valueCompact : null]} numberOfLines={1}>
        {value}
      </Text>

      {subtitle && !compact ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </Component>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    flex: 1,
    minWidth: 130,
  },
  cardCompact: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerRowCompact: {
    marginBottom: 4,
  },
  title: {
    ...typography.captionBold,
    color: colors.textSecondary,
    flex: 1,
    marginRight: spacing.xs,
  },
  titleCompact: {
    fontSize: 12,
    fontWeight: '600',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerCompact: {
    width: 26,
    height: 26,
    borderRadius: 7,
  },
  value: {
    ...typography.statValue,
    color: colors.textPrimary,
    marginTop: spacing.xxs,
  },
  valueCompact: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: 0,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
});
