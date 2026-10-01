import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';

export const Badge = ({
  label,
  variant = 'default', // 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'default'
  size = 'medium',      // 'small' | 'medium'
  style,
  textStyle,
}) => {
  const getBadgeStyle = () => {
    switch (variant) {
      case 'success':
        return { backgroundColor: colors.successLight, borderColor: colors.success };
      case 'warning':
        return { backgroundColor: colors.warningLight, borderColor: colors.warning };
      case 'danger':
        return { backgroundColor: colors.dangerLight, borderColor: colors.danger };
      case 'info':
        return { backgroundColor: colors.infoLight, borderColor: colors.info };
      case 'neutral':
        return { backgroundColor: colors.surfaceVariant, borderColor: colors.border };
      case 'default':
      default:
        return { backgroundColor: colors.primaryLight, borderColor: colors.primary };
    }
  };

  const getBadgeTextColor = () => {
    switch (variant) {
      case 'success':
        return colors.success;
      case 'warning':
        return '#B45309'; // Darker amber for contrast
      case 'danger':
        return colors.danger;
      case 'info':
        return colors.info;
      case 'neutral':
        return colors.textSecondary;
      case 'default':
      default:
        return colors.primaryDark;
    }
  };

  return (
    <View
      style={[
        styles.badge,
        getBadgeStyle(),
        size === 'small' && styles.badgeSmall,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: getBadgeTextColor() },
          size === 'small' && styles.textSmall,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
  },
  text: {
    ...typography.captionBold,
    textTransform: 'capitalize',
  },
  textSmall: {
    fontSize: 10,
    lineHeight: 12,
  },
});
