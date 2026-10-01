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
}) => {
  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.card, style]}
      accessibilityRole={onPress ? 'button' : 'summary'}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
            {icon}
          </View>
        )}
      </View>

      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>

      {subtitle ? (
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    flex: 1,
    minWidth: 140,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.captionBold,
    color: colors.textSecondary,
    flex: 1,
    marginRight: spacing.xs,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    ...typography.statValue,
    color: colors.textPrimary,
    marginTop: spacing.xxs,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
});
