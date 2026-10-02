import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, borderRadius } from '../theme/spacing';
import { Button } from './Button';

export const EmptyState = ({
  icon = 'shield-outline',
  title = 'No items found',
  description,
  buttonTitle,
  onButtonPress,
  buttonIcon,
  buttonVariant,
  style,
}) => {
  const getButtonIcon = () => {
    if (buttonIcon) return buttonIcon;
    if (!buttonTitle) return null;
    const lower = buttonTitle.toLowerCase();
    const isOutline = buttonVariant === 'outline' || lower.includes('clear') || lower.includes('reset');
    const iconColor = isOutline ? colors.primary : colors.textInverse;

    if (lower.includes('add')) {
      return <Ionicons name="add-circle-outline" size={18} color={iconColor} />;
    }
    if (lower.includes('clear') || lower.includes('reset')) {
      return <Ionicons name="close-circle-outline" size={18} color={iconColor} />;
    }
    if (lower.includes('refresh') || lower.includes('retry')) {
      return <Ionicons name="refresh-outline" size={18} color={iconColor} />;
    }
    return null;
  };

  const getButtonVariant = () => {
    if (buttonVariant) return buttonVariant;
    if (buttonTitle && (buttonTitle.toLowerCase().includes('clear') || buttonTitle.toLowerCase().includes('reset'))) {
      return 'outline';
    }
    return 'primary';
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={36} color={colors.primary} />
      </View>

      <Text style={styles.title}>{title}</Text>

      {description ? <Text style={styles.description}>{description}</Text> : null}

      {buttonTitle && onButtonPress ? (
        <View style={styles.buttonWrapper}>
          <Button
            title={buttonTitle}
            onPress={onButtonPress}
            size="small"
            fullWidth={false}
            variant={getButtonVariant()}
            icon={getButtonIcon()}
            iconPosition="left"
            style={styles.actionButton}
            textStyle={styles.actionButtonText}
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    maxWidth: 280,
  },
  buttonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  actionButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 3,
    height: 'auto',
    minHeight: 38,
    borderRadius: borderRadius.md,
    alignSelf: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
