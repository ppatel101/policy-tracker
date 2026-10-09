import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing, layout } from '../theme/spacing';

export const Button = ({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
  size = 'medium',     // 'small' | 'medium' | 'large'
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = true,
  style,
  textStyle,
  ...rest
}) => {
  const isDisabled = disabled || loading;

  const getContainerStyle = () => {
    const list = [styles.base];

    if (fullWidth) list.push(styles.fullWidth);

    // Size
    if (size === 'small') list.push(styles.sizeSmall);
    else if (size === 'large') list.push(styles.sizeLarge);
    else list.push(styles.sizeMedium);

    // Variant
    switch (variant) {
      case 'secondary':
        list.push(styles.secondary);
        break;
      case 'outline':
        list.push(styles.outline);
        break;
      case 'danger':
        list.push(styles.danger);
        break;
      case 'ghost':
        list.push(styles.ghost);
        break;
      case 'primary':
      default:
        list.push(styles.primary);
        break;
    }

    if (isDisabled) list.push(styles.disabled);
    if (style) list.push(style);

    return list;
  };

  const getTextStyle = () => {
    const list = [styles.textBase];

    if (size === 'small') list.push(styles.textSmall);
    else if (size === 'large') list.push(styles.textLarge);
    else list.push(styles.textMedium);

    switch (variant) {
      case 'secondary':
        list.push(styles.textSecondary);
        break;
      case 'outline':
        list.push(styles.textOutline);
        break;
      case 'danger':
        list.push(styles.textDanger);
        break;
      case 'ghost':
        list.push(styles.textGhost);
        break;
      case 'primary':
      default:
        list.push(styles.textPrimary);
        break;
    }

    if (isDisabled) list.push(styles.textDisabled);
    if (textStyle) list.push(textStyle);

    return list;
  };

  const getSpinnerColor = () => {
    if (variant === 'outline' || variant === 'ghost') return colors.primary;
    if (variant === 'secondary') return colors.textPrimary;
    return colors.textInverse;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={isDisabled}
      style={getContainerStyle()}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getSpinnerColor()} />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text style={getTextStyle()}>{title}</Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },

  // Sizes
  sizeSmall: {
    height: layout.smallButtonHeight,
    paddingHorizontal: spacing.md,
  },
  sizeMedium: {
    height: layout.buttonHeight,
    paddingHorizontal: spacing.lg,
  },
  sizeLarge: {
    height: 54,
    paddingHorizontal: spacing.xl,
  },

  // Variants
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },

  // Text
  textBase: {
    fontFamily: typography.bodyBold.fontFamily,
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 11,
  },
  textMedium: {
    fontSize: 13,
  },
  textLarge: {
    fontSize: 15,
  },
  textPrimary: {
    color: colors.textInverse,
  },
  textSecondary: {
    color: colors.textPrimary,
  },
  textOutline: {
    color: colors.primary,
  },
  textDanger: {
    color: colors.textInverse,
  },
  textGhost: {
    color: colors.primary,
  },
  textDisabled: {
    color: colors.textMuted,
  },
});
