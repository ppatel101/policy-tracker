import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/authService';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { validateEmail } from '../../utils/validation';

export const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [emailError, setEmailError] = useState(null);

  const handleReset = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    const err = validateEmail(email);
    if (err) {
      setEmailError(err);
      return;
    }
    setEmailError(null);

    setLoading(true);
    try {
      const result = await authService.resetPassword(email);
      if (result.error) {
        setErrorMessage(result.error);
      } else {
        setSuccessMessage('Password reset instructions sent to your email.');
      }
    } catch (e) {
      setErrorMessage(e.message || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            <Text style={styles.backLinkText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="key-outline" size={32} color={colors.primary} />
            </View>

            <Text style={styles.cardTitle}>Forgot Password?</Text>
            <Text style={styles.cardSubtitle}>
              Enter your registered email and we'll send you instructions to reset your password.
            </Text>

            {errorMessage ? (
              <View style={styles.errorAlert}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.errorAlertText}>{errorMessage}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={styles.successAlert}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={styles.successAlertText}>{successMessage}</Text>
              </View>
            ) : null}

            <Input
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (emailError) setEmailError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={<Ionicons name="mail-outline" size={20} color={colors.textMuted} />}
              error={emailError}
              required
            />

            <Button
              title="Send Reset Instructions"
              onPress={handleReset}
              loading={loading}
              variant="primary"
              size="large"
              style={styles.submitBtn}
            />

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Login')}
              style={styles.returnToLogin}
            >
              <Text style={styles.returnToLoginText}>Return to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.lg,
  },
  backLinkText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  cardSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorAlertText: {
    ...typography.captionBold,
    color: colors.danger,
    flex: 1,
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  successAlertText: {
    ...typography.captionBold,
    color: colors.success,
    flex: 1,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  returnToLogin: {
    alignSelf: 'center',
    marginTop: spacing.lg,
  },
  returnToLoginText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
});
