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
import { validatePassword } from '../../utils/validation';

export const ResetPasswordScreen = ({ navigation }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState({});

  const handleUpdatePassword = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    const newErrors = {};

    const passErr = validatePassword(password);
    if (passErr) newErrors.password = passErr;

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const result = await authService.updatePassword(password);
      if (result.error) {
        setErrorMessage(result.error);
      } else {
        setSuccessMessage('Password updated successfully. You can now login.');
        setTimeout(() => {
          navigation.navigate('Login');
        }, 1500);
      }
    } catch (e) {
      setErrorMessage(e.message || 'Failed to update password.');
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
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Set New Password</Text>
            <Text style={styles.cardSubtitle}>
              Please enter and confirm your new secure password.
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
              label="New Password"
              placeholder="At least 6 characters"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (errors.password) setErrors((p) => ({ ...p, password: null }));
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />}
              rightIcon={
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textMuted}
                />
              }
              onRightIconPress={() => setShowPassword(!showPassword)}
              error={errors.password}
              required
            />

            <Input
              label="Confirm New Password"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: null }));
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />}
              error={errors.confirmPassword}
              required
            />

            <Button
              title="Update Password"
              onPress={handleUpdatePassword}
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
              <Text style={styles.returnToLoginText}>Back to Sign In</Text>
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
  cardTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  cardSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    marginTop: spacing.xs,
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
    marginTop: spacing.md,
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
