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
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { validateEmail, validatePassword, validatePhone } from '../../utils/validation';

export const RegisterScreen = ({ navigation }) => {
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const handleRegister = async () => {
    setErrorMessage('');
    const errors = {};

    if (!fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    const emailErr = validateEmail(email);
    if (emailErr) errors.email = emailErr;

    const phoneErr = validatePhone(phone);
    if (phoneErr) errors.phone = phoneErr;

    const passErr = validatePassword(password);
    if (passErr) errors.password = passErr;

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setLoading(true);
    try {
      const result = await signUp({
        email,
        password,
        fullName,
        phone,
      });

      if (result.error) {
        setErrorMessage(result.error);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
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
            <Text style={styles.cardTitle}>Create Account</Text>
            <Text style={styles.cardSubtitle}>Start tracking your insurance policies</Text>

            {errorMessage ? (
              <View style={styles.errorAlert}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.errorAlertText}>{errorMessage}</Text>
              </View>
            ) : null}

            <Input
              label="Full Name"
              placeholder="John Doe"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (fieldErrors.fullName) setFieldErrors((p) => ({ ...p, fullName: null }));
              }}
              autoCapitalize="words"
              leftIcon={<Ionicons name="person-outline" size={20} color={colors.textMuted} />}
              error={fieldErrors.fullName}
              required
            />

            <Input
              label="Email Address"
              placeholder="john@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: null }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={<Ionicons name="mail-outline" size={20} color={colors.textMuted} />}
              error={fieldErrors.email}
              required
            />

            <Input
              label="Phone Number"
              placeholder="+91 9876543210"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: null }));
              }}
              keyboardType="phone-pad"
              leftIcon={<Ionicons name="call-outline" size={20} color={colors.textMuted} />}
              error={fieldErrors.phone}
            />

            <Input
              label="Password"
              placeholder="At least 6 characters"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: null }));
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
              error={fieldErrors.password}
              required
            />

            <Input
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (fieldErrors.confirmPassword) setFieldErrors((p) => ({ ...p, confirmPassword: null }));
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />}
              error={fieldErrors.confirmPassword}
              required
            />

            <Button
              title="Sign Up"
              onPress={handleRegister}
              loading={loading}
              variant="primary"
              size="large"
              style={styles.submitBtn}
            />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.footerLink}>Sign In</Text>
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
    justifyContent: 'center',
    padding: spacing.xl,
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
    marginBottom: spacing.lg,
    marginTop: 2,
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
  submitBtn: {
    marginTop: spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  footerLink: {
    ...typography.bodyBold,
    color: colors.primary,
  },
});
