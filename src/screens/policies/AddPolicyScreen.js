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
import { DatePickerInput } from '../../components/DatePickerInput';
import { validatePolicyForm } from '../../utils/validation';
import { calculateEndDate, calculateNextDueDate, formatDate, startOfDay } from '../../utils/dateUtils';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import {
  POLICY_TYPES,
  PAYMENT_FREQUENCIES,
  isHealthPolicy,
  isVehiclePolicy,
  isAnnualRenewablePolicy,
  hasPolicyTerms,
  getCoverageLabel,
  FAMILY_RELATIONS,
} from '../../utils/constants';
import { generateUUID } from '../../utils/uuid';

export const AddPolicyScreen = ({ navigation, route }) => {
  const { addPolicy } = usePolicies();

  const initialType = route?.params?.policyType || 'Life Insurance';
  const isInitialAnnual = isAnnualRenewablePolicy(initialType);
  const todayStr = formatDate(new Date());

  const [policyName, setPolicyName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [policyType, setPolicyType] = useState(initialType);
  const [sumAssured, setSumAssured] = useState('');
  const [tpaName, setTpaName] = useState('');
  const [coveredMembers, setCoveredMembers] = useState([]);
  const [premiumAmount, setPremiumAmount] = useState('');
  const [paymentFrequency, setPaymentFrequency] = useState('yearly');
  const [startDate, setStartDate] = useState(todayStr);
  const [premiumPayingTerm, setPremiumPayingTerm] = useState(isInitialAnnual ? '1' : '5');
  const [policyTermYears, setPolicyTermYears] = useState(isInitialAnnual ? '1' : '10');
  const [nextDueDate, setNextDueDate] = useState(calculateNextDueDate(todayStr, 'yearly'));
  const [reminderEnabled, setReminderEnabled] = useState(true);

  // State for inline add member
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRelation, setNewMemberRelation] = useState('Self');
  const [newMemberAge, setNewMemberAge] = useState('');
  const [newMemberId, setNewMemberId] = useState('');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const isAnnual = isAnnualRenewablePolicy(policyType);
  const showTerms = hasPolicyTerms(policyType);
  const effectivePpt = showTerms ? premiumPayingTerm : '1';
  const effectivePolicyTerm = showTerms ? policyTermYears : '1';
  const effectiveDuration = effectivePpt;
  const effectiveNextDueDate = calculateNextDueDate(startDate, isAnnual ? 'yearly' : paymentFrequency);

  // Auto-calculated end date (based on Policy Term)
  const calculatedEndDate = calculateEndDate(startDate, effectivePolicyTerm);
  const isPastStartDate = startDate && startOfDay(startDate).getTime() < startOfDay(new Date()).getTime();

  // When start date changes, update next due date based on payment frequency
  const handleStartDateChange = (date) => {
    setStartDate(date);
    if (isAnnualRenewablePolicy(policyType)) {
      setNextDueDate(calculateNextDueDate(date, 'yearly'));
    } else {
      setNextDueDate(calculateNextDueDate(date, paymentFrequency));
    }
    if (errors.startDate) setErrors((prev) => ({ ...prev, startDate: null }));
  };

  const handleFrequencyChange = (freq) => {
    setPaymentFrequency(freq);
    if (!isAnnualRenewablePolicy(policyType)) {
      setNextDueDate(calculateNextDueDate(startDate, freq));
    }
  };

  const handleSelectPolicyType = (type) => {
    setPolicyType(type);
    if (isAnnualRenewablePolicy(type)) {
      // Fixed at 1 year for Health and Vehicle Insurance (Annual Renewal)
      setPremiumPayingTerm('1');
      setPolicyTermYears('1');
      setPaymentFrequency('yearly');
      setNextDueDate(calculateNextDueDate(startDate, 'yearly'));
    } else {
      if (premiumPayingTerm === '1') setPremiumPayingTerm('5');
      if (policyTermYears === '1') setPolicyTermYears('10');
    }
  };

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    const member = {
      id: generateUUID(),
      name: newMemberName.trim(),
      relation: newMemberRelation,
      age: newMemberAge.trim() ? parseInt(newMemberAge, 10) : null,
      memberId: newMemberId.trim(),
    };
    setCoveredMembers((prev) => [...prev, member]);
    setNewMemberName('');
    setNewMemberAge('');
    setNewMemberId('');
    setNewMemberRelation('Spouse');
    setShowMemberForm(false);
  };

  const handleRemoveMember = (idxToRemove) => {
    setCoveredMembers((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleSave = async () => {
    setServerError('');
    const parsedSum = sumAssured.trim() ? parseFloat(sumAssured.replace(/,/g, '')) : null;
    const formValues = {
      policyName,
      companyName,
      policyNumber,
      policyType,
      sumAssured: parsedSum,
      tpaName: tpaName.trim(),
      coveredMembers,
      premiumAmount,
      paymentFrequency: isAnnual ? 'yearly' : paymentFrequency,
      startDate,
      durationYears: effectivePpt,
      premiumPayingTerm: effectivePpt,
      policyTermYears: effectivePolicyTerm,
      nextDueDate: effectiveNextDueDate,
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
                    onPress={() => handleSelectPolicyType(type)}
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

          {isHealthPolicy(policyType) ? (
            <View style={styles.healthBanner}>
              <Ionicons name="medical" size={20} color={colors.primary} />
              <View style={styles.healthBannerTextCol}>
                <Text style={styles.healthBannerTitle}>Annual Renewable Mediclaim</Text>
                <Text style={styles.healthBannerDesc}>
                  Health policies default to a 1-year annual renewal cycle with family floater coverage.
                </Text>
              </View>
            </View>
          ) : isVehiclePolicy(policyType) ? (
            <View style={styles.healthBanner}>
              <Ionicons name="car-sport" size={20} color={colors.primary} />
              <View style={styles.healthBannerTextCol}>
                <Text style={styles.healthBannerTitle}>Annual Renewable Vehicle Insurance</Text>
                <Text style={styles.healthBannerDesc}>
                  Vehicle policies renew annually with 1-year duration and IDV (Insured Declared Value) tracking.
                </Text>
              </View>
            </View>
          ) : null}

          {/* Section: Financials */}
          <Text style={styles.sectionHeader}>Coverage & Premium</Text>

          <Input
            label={`${getCoverageLabel(policyType)}`}
            placeholder={isVehiclePolicy(policyType) ? "e.g. 6,50,000" : "e.g. 10,00,000"}
            value={sumAssured}
            onChangeText={(t) => {
              const cleaned = t.replace(/[^0-9]/g, '').slice(0, 8);
              setSumAssured(cleaned);
              if (errors.sumAssured) setErrors((prev) => ({ ...prev, sumAssured: null }));
            }}
            keyboardType="numeric"
            maxLength={8}
            leftIcon={<Ionicons name={isVehiclePolicy(policyType) ? "car-outline" : "shield-outline"} size={18} color={colors.textSecondary} />}
            error={errors.sumAssured}
          />

          {/* Section: Covered Family Members (Phase 2) */}
          {isHealthPolicy(policyType) ? (
            <View style={styles.healthSectionContainer}>
              <View style={styles.healthSectionHeaderRow}>
                <Text style={styles.sectionHeader}>Covered Family Members ({coveredMembers.length})</Text>
                {!showMemberForm && (
                  <TouchableOpacity
                    onPress={() => setShowMemberForm(true)}
                    style={styles.addMemberHeaderBtn}
                  >
                    <Ionicons name="add-circle" size={18} color={colors.primary} />
                    <Text style={styles.addMemberBtnText}>Add Member</Text>
                  </TouchableOpacity>
                )}
              </View>

              {coveredMembers.length === 0 && !showMemberForm ? (
                <View style={styles.emptyMembersBox}>
                  <Ionicons name="people-outline" size={24} color={colors.textMuted} />
                  <Text style={styles.emptyMembersText}>
                    Add family members covered under this Mediclaim plan.
                  </Text>
                </View>
              ) : null}

              {/* List of Covered Members */}
              {coveredMembers.map((m, idx) => (
                <View key={m.id || idx} style={styles.memberCard}>
                  <View style={styles.memberLeft}>
                    <View style={styles.memberIconBg}>
                      <Ionicons name="person" size={16} color={colors.primary} />
                    </View>
                    <View style={styles.memberTextCol}>
                      <Text style={styles.memberName}>{m.name}</Text>
                      <Text style={styles.memberDetails}>
                        {m.relation} {m.age ? `• ${m.age} yrs` : ''} {m.memberId ? `• ID: ${m.memberId}` : ''}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveMember(idx)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.removeMemberBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Inline Add Member Form */}
              {showMemberForm ? (
                <View style={styles.memberFormCard}>
                  <Text style={styles.memberFormTitle}>Add Covered Member</Text>
                  <Input
                    label="Full Name"
                    placeholder="e.g. Pooja Sharma"
                    value={newMemberName}
                    onChangeText={setNewMemberName}
                    required
                  />

                  <Text style={styles.fieldLabel}>Relationship</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.relationChipsRow}>
                    {FAMILY_RELATIONS.map((rel) => {
                      const isRelSelected = newMemberRelation === rel;
                      return (
                        <TouchableOpacity
                          key={rel}
                          onPress={() => setNewMemberRelation(rel)}
                          style={[styles.relationChip, isRelSelected && styles.relationChipActive]}
                        >
                          <Text style={[styles.relationChipText, isRelSelected && styles.relationChipTextActive]}>
                            {rel}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <View style={styles.rowInputs}>
                    <View style={styles.halfInput}>
                      <Input
                        label="Age (Years)"
                        placeholder="e.g. 32"
                        value={newMemberAge}
                        onChangeText={setNewMemberAge}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.halfInput}>
                      <Input
                        label="Member / TPA ID (Optional)"
                        placeholder="e.g. MED-01"
                        value={newMemberId}
                        onChangeText={setNewMemberId}
                      />
                    </View>
                  </View>

                  <View style={styles.memberFormActions}>
                    <Button
                      title="Cancel"
                      variant="ghost"
                      size="small"
                      onPress={() => setShowMemberForm(false)}
                    />
                    <Button
                      title="Add to Plan"
                      size="small"
                      onPress={handleAddMember}
                      disabled={!newMemberName.trim()}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Section: TPA Details */}
          {isHealthPolicy(policyType) ? (
            <View style={styles.healthSectionContainer}>
              <Text style={styles.sectionHeader}>TPA Details</Text>
              <Input
                label="TPA Name (Optional)"
                placeholder="e.g. Medi Assist TPA / Star Health In-House / Vidal"
                value={tpaName}
                onChangeText={setTpaName}
                leftIcon={<Ionicons name="business-outline" size={18} color={colors.textSecondary} />}
              />
            </View>
          ) : null}

          <Input
            label="Premium Amount (₹)"
            placeholder="e.g. 25000"
            value={premiumAmount}
            onChangeText={(t) => {
              const cleaned = t.replace(/[^0-9]/g, '').slice(0, 8);
              setPremiumAmount(cleaned);
              if (errors.premiumAmount) setErrors((prev) => ({ ...prev, premiumAmount: null }));
            }}
            keyboardType="numeric"
            maxLength={8}
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
                    onPress={() => handleFrequencyChange(freq.value)}
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

          {/* Section: Dates & Policy Term */}
          <Text style={styles.sectionHeader}>
            {showTerms ? 'Dates & Policy Term' : 'Policy Dates'}
          </Text>

          {showTerms ? (
            <>
              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <DatePickerInput
                    label="Start Date"
                    value={startDate}
                    onChange={handleStartDateChange}
                    error={errors.startDate}
                    helperText={isPastStartDate ? 'Premiums before today will be marked as paid' : undefined}
                    required
                  />
                </View>

                <View style={styles.halfInput}>
                  <Input
                    label="Premium Paying Term"
                    placeholder="e.g. 5"
                    value={effectivePpt}
                    onChangeText={(t) => {
                      const cleaned = t.replace(/[^0-9]/g, '').slice(0, 2);
                      setPremiumPayingTerm(cleaned);
                      if (errors.premiumPayingTerm || errors.durationYears) {
                        setErrors((prev) => ({ ...prev, premiumPayingTerm: null, durationYears: null }));
                      }
                      const num = parseInt(cleaned, 10);
                      const ptNum = parseInt(policyTermYears, 10);
                      if (!isNaN(num) && (!ptNum || ptNum < num)) {
                        setPolicyTermYears(cleaned);
                      }
                    }}
                    keyboardType="numeric"
                    maxLength={2}
                    error={errors.premiumPayingTerm || errors.durationYears}
                    required
                  />
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <Input
                    label="Policy Term"
                    placeholder="e.g. 10"
                    value={effectivePolicyTerm}
                    onChangeText={(t) => {
                      const cleaned = t.replace(/[^0-9]/g, '').slice(0, 2);
                      setPolicyTermYears(cleaned);
                      if (errors.policyTermYears) {
                        setErrors((prev) => ({ ...prev, policyTermYears: null }));
                      }
                    }}
                    keyboardType="numeric"
                    maxLength={2}
                    error={errors.policyTermYears}
                    required
                  />
                </View>

                <View style={styles.halfInput}>
                  <DatePickerInput
                    label="End Date"
                    value={calculatedEndDate}
                    disabled={true}
                    required
                  />
                </View>
              </View>
            </>
          ) : (
            /* For Health & Vehicle: PPT and Policy Term are hidden */
            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <DatePickerInput
                  label="Start Date"
                  value={startDate}
                  onChange={handleStartDateChange}
                  error={errors.startDate}
                  helperText={isPastStartDate ? 'Premiums before today will be marked as paid' : undefined}
                  required
                />
              </View>

              <View style={styles.halfInput}>
                <DatePickerInput
                  label="End Date"
                  value={calculatedEndDate}
                  disabled={true}
                  required
                />
              </View>
            </View>
          )}

          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              <DatePickerInput
                label="Next Due Date"
                value={effectiveNextDueDate}
                onChange={setNextDueDate}
                disabled={true}
                helperText={
                  isAnnual
                    ? 'Fixed at 1 year after start date (Annual Renewal)'
                    : 'Auto-calculated from start date & payment frequency'
                }
                error={errors.nextDueDate}
                required
              />
            </View>

            <View style={styles.halfInput} />
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
    fontSize: 14,
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
    fontSize: 10,
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
  healthBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  healthBannerTextCol: {
    flex: 1,
  },
  healthBannerTitle: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 11,
  },
  healthBannerDesc: {
    ...typography.caption,
    color: colors.primaryDark,
    marginTop: 2,
    fontSize: 10,
  },
  healthSectionContainer: {
    marginBottom: spacing.lg,
  },
  healthSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  addMemberHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.full,
  },
  addMemberBtnText: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 10,
  },
  emptyMembersBox: {
    backgroundColor: colors.surfaceVariant,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: spacing.xs,
  },
  emptyMembersText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  memberIconBg: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberTextCol: {
    flex: 1,
  },
  memberName: {
    ...typography.subtitle,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  memberDetails: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  removeMemberBtn: {
    padding: spacing.xs,
  },
  memberFormCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  memberFormTitle: {
    ...typography.subtitle,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  relationChipsRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  relationChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  relationChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  relationChipText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 10,
  },
  relationChipTextActive: {
    color: colors.textInverse,
  },
  memberFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
