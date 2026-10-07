import React, { useState, useEffect } from 'react';
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
import { calculateEndDate } from '../../utils/dateUtils';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import {
  POLICY_TYPES,
  PAYMENT_FREQUENCIES,
  POLICY_STATUSES,
  isHealthPolicy,
  isVehiclePolicy,
  isAnnualRenewablePolicy,
  getCoverageLabel,
  FAMILY_RELATIONS,
} from '../../utils/constants';
import { generateUUID } from '../../utils/uuid';

export const EditPolicyScreen = ({ route, navigation }) => {
  const { policyId } = route.params || {};
  const { policies, updatePolicy } = usePolicies();

  const currentPolicy = policies.find((p) => p.id === policyId);

  const [policyName, setPolicyName] = useState(currentPolicy?.policyName || '');
  const [companyName, setCompanyName] = useState(currentPolicy?.companyName || '');
  const [policyNumber, setPolicyNumber] = useState(currentPolicy?.policyNumber || '');
  const [policyType, setPolicyType] = useState(currentPolicy?.policyType || 'Life Insurance');
  const [sumAssured, setSumAssured] = useState(
    currentPolicy?.sumAssured != null ? String(currentPolicy.sumAssured) : ''
  );
  const [tpaName, setTpaName] = useState(currentPolicy?.tpaName || '');
  const [coveredMembers, setCoveredMembers] = useState(
    Array.isArray(currentPolicy?.coveredMembers) ? currentPolicy.coveredMembers : []
  );
  const [premiumAmount, setPremiumAmount] = useState(String(currentPolicy?.premiumAmount || ''));
  const [paymentFrequency, setPaymentFrequency] = useState(currentPolicy?.paymentFrequency || 'yearly');
  const [startDate, setStartDate] = useState(currentPolicy?.startDate || '');
  const isInitialAnnual = isAnnualRenewablePolicy(currentPolicy?.policyType);
  const [durationYears, setDurationYears] = useState(
    isInitialAnnual ? '1' : String(currentPolicy?.durationYears || '1')
  );
  const [nextDueDate, setNextDueDate] = useState(
    isInitialAnnual && currentPolicy?.startDate
      ? calculateEndDate(currentPolicy.startDate, 1)
      : (currentPolicy?.nextDueDate || '')
  );
  const [status, setStatus] = useState(currentPolicy?.status || POLICY_STATUSES.ACTIVE);
  const [reminderEnabled, setReminderEnabled] = useState(
    currentPolicy?.reminderEnabled !== undefined ? currentPolicy.reminderEnabled : true
  );

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
  const effectiveDuration = isAnnual ? '1' : durationYears;
  const effectiveNextDueDate = isAnnual ? calculateEndDate(startDate, 1) : nextDueDate;
  const calculatedEndDate = calculateEndDate(startDate, effectiveDuration);

  const handleStartDateChange = (date) => {
    setStartDate(date);
    if (isAnnualRenewablePolicy(policyType)) {
      setNextDueDate(calculateEndDate(date, 1));
    }
    if (errors.startDate) setErrors((prev) => ({ ...prev, startDate: null }));
  };

  const handleSelectPolicyType = (type) => {
    setPolicyType(type);
    if (isAnnualRenewablePolicy(type)) {
      // Fixed at 1 year for Health and Vehicle Insurance (Annual Renewal)
      setDurationYears('1');
      setPaymentFrequency('yearly');
      setNextDueDate(calculateEndDate(startDate, 1));
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

  const handleUpdate = async () => {
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
      durationYears: effectiveDuration,
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
      const result = await updatePolicy(policyId, {
        ...formValues,
        endDate: calculatedEndDate,
        status,
      });

      if (result.error && !result.policy) {
        setServerError(result.error);
      } else {
        navigation.goBack();
      }
    } catch (err) {
      setServerError(err.message || 'Failed to update policy');
    } finally {
      setLoading(false);
    }
  };

  if (!currentPolicy) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Edit Policy" onBack={() => navigation.goBack()} />
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>Policy not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Edit Policy"
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

          <Text style={styles.sectionHeader}>Policy Details</Text>

          <Input
            label="Policy Name"
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
                  Health policies default to a 1-year annual renewal cycle with family floater and TPA coverage.
                </Text>
              </View>
            </View>
          ) : null}

          {/* Status Selector */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Policy Status</Text>
            <View style={styles.frequencyRow}>
              {Object.values(POLICY_STATUSES).map((st) => {
                const isSelected = status === st;
                return (
                  <TouchableOpacity
                    key={st}
                    activeOpacity={0.7}
                    onPress={() => setStatus(st)}
                    style={[styles.statusChip, isSelected && styles.statusChipActive]}
                  >
                    <Text style={[styles.statusChipText, isSelected && styles.statusChipTextActive]}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Text style={styles.sectionHeader}>Coverage & Premium</Text>

          <Input
            label={`${getCoverageLabel(policyType)} (₹) (Optional)`}
            placeholder={isVehiclePolicy(policyType) ? "e.g. 6,50,000" : "e.g. 10,00,000"}
            value={sumAssured}
            onChangeText={(t) => {
              setSumAssured(t);
              if (errors.sumAssured) setErrors((prev) => ({ ...prev, sumAssured: null }));
            }}
            keyboardType="numeric"
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

          <Text style={styles.sectionHeader}>Dates & Policy Term</Text>

          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              <DatePickerInput
                label="Start Date"
                value={startDate}
                onChange={handleStartDateChange}
                error={errors.startDate}
                required
              />
            </View>

            <View style={styles.halfInput}>
              <Input
                label="Duration (Years)"
                value={effectiveDuration}
                onChangeText={(t) => {
                  setDurationYears(t);
                  if (errors.durationYears) setErrors((prev) => ({ ...prev, durationYears: null }));
                }}
                keyboardType="numeric"
                editable={!isAnnual}
                helperText={isAnnual ? 'Fixed at 1 Year for annual renewable policy' : undefined}
                error={errors.durationYears}
                required
              />
            </View>
          </View>

          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              <DatePickerInput
                label="Next Due Date"
                value={effectiveNextDueDate}
                onChange={(t) => {
                  setNextDueDate(t);
                  if (errors.nextDueDate) setErrors((prev) => ({ ...prev, nextDueDate: null }));
                }}
                disabled={isAnnual}
                helperText={isAnnual ? 'Fixed at 1 year after start date (Annual Renewal)' : undefined}
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
                Enable upcoming premium reminders
              </Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          <Button
            title="Save Changes"
            onPress={handleUpdate}
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
  notFoundContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  notFoundText: {
    ...typography.body,
    color: colors.textSecondary,
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
  statusChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statusChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusChipText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  statusChipTextActive: {
    color: colors.textInverse,
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
    fontSize: 13,
  },
  healthBannerDesc: {
    ...typography.caption,
    color: colors.primaryDark,
    marginTop: 2,
    fontSize: 11,
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
    fontSize: 12,
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
    fontSize: 12,
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
