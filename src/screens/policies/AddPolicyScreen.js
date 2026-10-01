import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePolicies } from '../../context/PolicyContext';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { validatePolicyForm } from '../../utils/validation';
import { calculateEndDate, formatDate } from '../../utils/dateUtils';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { POLICY_TYPES, PAYMENT_FREQUENCIES } from '../../utils/constants';

export const AddPolicyScreen = ({ navigation }) => {
  const { addPolicy } = usePolicies();

  const todayStr = formatDate(new Date());

  const [policyName, setPolicyName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [policyType, setPolicyType] = useState('Life Insurance');
  const [premiumAmount, setPremiumAmount] = useState('');
  const [paymentFrequency, setPaymentFrequency] = useState('yearly');
  const [startDate, setStartDate] = useState(todayStr);
  const [durationYears, setDurationYears] = useState('5');
  const [nextDueDate, setNextDueDate] = useState(todayStr);
  const [reminderEnabled, setReminderEnabled] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  // Auto-calculated end date
  const calculatedEndDate = calculateEndDate(startDate, durationYears);

  // When start date changes, optionally update next due date if default
  const handleStartDateChange = (date) => {
    setStartDate(date);
    if (!nextDueDate || nextDueDate === startDate) {
      setNextDueDate(date);
    }
  };

  const handleSave = async () => {
    setServerError('');
    const formValues = {
      policyName,
      companyName,
      policyNumber,
      policyType,
      premiumAmount,
      paymentFrequency,
      startDate,
      durationYears,
      nextDueDate,
      reminderEnabled,
    };

    const validation = validatePolicyForm(formValues);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const result = await addPolicy({
        ...formValues,
        endDate: calculatedEndDate,
      });

      if (result.error && !result.policy) {
        setServerError(result.error);
      } else {
        navigation.goBack();
      }
    } catch (err) {
      setServerError(err.message || 'Failed to save policy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Add New Policy"
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {serverError ? (
            <View style={styles.errorAlert}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorAlertText}>{serverError}</Text>
            </View>
          ) : null}

          {/* Section: Basic Details */}
          <Text style={styles.sectionHeader}>Policy Details</Text>

          <Input
            label="Policy Name"
            placeholder="e.g. Jeevan Anand or Family Health"
            value={policyName}
            onChangeText={(t) => {
              setPolicyName(t);
              if (errors.policyName) setErrors((prev) => ({ ...prev, policyName: null }));
            }}
            error={errors.policyName}
            required
          />

          <Input
            label="Insurance Company"
            placeholder="e.g. LIC, HDFC Ergo, Star Health"
            value={companyName}
            onChangeText={(t) => {
              setCompanyName(t);
              if (errors.companyName) setErrors((prev) => ({ ...prev, companyName: null }));
            }}
            error={errors.companyName}
            required
          />

          <Input
            label="Policy Number"
            placeholder="e.g. POL-987654321 (Optional)"
            value={policyNumber}
            onChangeText={setPolicyNumber}
          />

          {/* Policy Type Picker */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Policy Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
              {POLICY_TYPES.map((type) => {
                const isSelected = policyType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    activeOpacity={0.7}
                    onPress={() => setPolicyType(type)}
                    style={[styles.typeChip, isSelected && styles.typeChipActive]}
                  >
                    <Text style={[styles.typeChipText, isSelected && styles.typeChipTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Section: Financials */}
          <Text style={styles.sectionHeader}>Premium & Schedule</Text>

          <Input
            label="Premium Amount (₹)"
            placeholder="e.g. 25000"
            value={premiumAmount}
            onChangeText={(t) => {
              setPremiumAmount(t);
              if (errors.premiumAmount) setErrors((prev) => ({ ...prev, premiumAmount: null }));
            }}
            keyboardType="numeric"
            leftIcon={<Text style={styles.currencyPrefix}>₹</Text>}
            error={errors.premiumAmount}
            required
          />

          {/* Payment Frequency Picker */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Payment Frequency</Text>
            <View style={styles.frequencyRow}>
              {PAYMENT_FREQUENCIES.map((freq) => {
                const isSelected = paymentFrequency === freq.value;
                return (
                  <TouchableOpacity
                    key={freq.value}
                    activeOpacity={0.7}
                    onPress={() => setPaymentFrequency(freq.value)}
                    style={[styles.freqChip, isSelected && styles.freqChipActive]}
                  >
                    <Text style={[styles.freqChipText, isSelected && styles.freqChipTextActive]}>
                      {freq.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Section: Dates & Duration */}
          <Text style={styles.sectionHeader}>Dates & Policy Term</Text>

          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              <Input
                label="Start Date"
                placeholder="YYYY-MM-DD"
                value={startDate}
                onChangeText={handleStartDateChange}
                error={errors.startDate}
                required
              />
            </View>

            <View style={styles.halfInput}>
              <Input
                label="Duration (Years)"
                placeholder="e.g. 5"
                value={durationYears}
                onChangeText={(t) => {
                  setDurationYears(t);
                  if (errors.durationYears) setErrors((prev) => ({ ...prev, durationYears: null }));
                }}
                keyboardType="numeric"
                error={errors.durationYears}
                required
              />
            </View>
          </View>

          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              <Input
                label="Next Due Date"
                placeholder="YYYY-MM-DD"
                value={nextDueDate}
                onChangeText={(t) => {
                  setNextDueDate(t);
                  if (errors.nextDueDate) setErrors((prev) => ({ ...prev, nextDueDate: null }));
                }}
                error={errors.nextDueDate}
                required
              />
            </View>

            <View style={styles.halfInput}>
              <View style={styles.computedBox}>
                <Text style={styles.computedLabel}>End Date (Calculated)</Text>
                <Text style={styles.computedValue}>{calculatedEndDate || 'N/A'}</Text>
              </View>
            </View>
          </View>

          {/* Reminder Toggle */}
          <View style={styles.reminderRow}>
            <View style={styles.reminderTextContainer}>
              <Text style={styles.reminderTitle}>Payment Reminders</Text>
              <Text style={styles.reminderSubtitle}>
                Receive notifications before each premium due date
              </Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          {/* Save Button */}
          <Button
            title="Save Policy & Generate Schedule"
            onPress={handleSave}
            loading={loading}
            variant="primary"
            size="large"
            style={styles.saveBtn}
          />
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
    padding: spacing.lg,
    paddingBottom: spacing.huge,
  },
  sectionHeader: {
    ...typography.subtitle,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  horizontalChips: {
    flexDirection: 'row',
  },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  typeChipTextActive: {
    color: colors.textInverse,
  },
  currencyPrefix: {
    ...typography.bodyBold,
    color: colors.primary,
    fontSize: 16,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  freqChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  freqChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  freqChipText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 12,
  },
  freqChipTextActive: {
    color: colors.primaryDark,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  computedBox: {
    height: 48,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    marginTop: 22,
  },
  computedLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  computedValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.md,
  },
  reminderTextContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  reminderTitle: {
    ...typography.subtitle,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  reminderSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  saveBtn: {
    marginTop: spacing.lg,
  },
});
