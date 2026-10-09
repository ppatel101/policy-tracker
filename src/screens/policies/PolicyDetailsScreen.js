import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePolicies } from '../../context/PolicyContext';
import { Header } from '../../components/Header';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { PaymentCard } from '../../components/PaymentCard';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { formatCurrency, formatSumAssured } from '../../utils/currencyUtils';
import {
  formatDisplayDate,
  calculateRemainingDuration,
  calculateEndDate,
  getDaysDifference,
} from '../../utils/dateUtils';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import {
  POLICY_STATUSES,
  PAYMENT_STATUSES,
  isHealthPolicy,
  isVehiclePolicy,
  isAnnualRenewablePolicy,
  getCoverageLabel,
  getCoverageShortLabel,
} from '../../utils/constants';

export const PolicyDetailsScreen = ({ route, navigation }) => {
  const { policyId } = route.params || {};
  const { policies, payments, deletePolicy, markPaymentPaid, renewPolicy } = usePolicies();

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [paying, setPaying] = useState(false);
  const [scheduleExpanded, setScheduleExpanded] = useState(false);

  // Health Insurance Renewal modal state
  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const [renewalPremium, setRenewalPremium] = useState('');
  const [renewing, setRenewing] = useState(false);
  const [renewalHistoryExpanded, setRenewalHistoryExpanded] = useState(false);

  const policy = policies.find((p) => p.id === policyId);

  // Policy payments sorted chronologically
  const policyPayments = payments
    .filter((p) => p.policyId === policyId)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Premium calculations: Total Paid vs Remaining to Pay
  const paidPayments = policyPayments.filter((p) => p.status === PAYMENT_STATUSES.PAID);
  const remainingPayments = policyPayments.filter((p) => p.status !== PAYMENT_STATUSES.PAID);

  const totalPremiumPaid = paidPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalPremiumRemaining = policyPayments.length > 0
    ? remainingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    : (() => {
        if (!policy) return 0;
        const years = parseInt(policy.durationYears, 10) || 1;
        const freq = (policy.paymentFrequency || '').toLowerCase();
        const perYear = freq === 'monthly' ? 12 : freq === 'quarterly' ? 4 : freq === 'half-yearly' ? 2 : 1;
        return (Number(policy.premiumAmount) || 0) * perYear * years;
      })();

  const totalExpectedPremium = totalPremiumPaid + totalPremiumRemaining;
  const percentPaid = totalExpectedPremium > 0
    ? Math.round((totalPremiumPaid / totalExpectedPremium) * 100)
    : 0;

  const remainingDurationText = policy ? calculateRemainingDuration(policy.endDate) : '';

  const isHealth = policy ? isHealthPolicy(policy.policyType) : false;
  const isVehicle = policy ? isVehiclePolicy(policy.policyType) : false;
  const isAnnual = policy ? isAnnualRenewablePolicy(policy.policyType) : false;
  const daysToRenewal = policy?.endDate ? getDaysDifference(policy.endDate, new Date()) : null;

  const handleOpenRenewModal = () => {
    if (!policy) return;
    setRenewalPremium(String(policy.premiumAmount || ''));
    setRenewModalVisible(true);
  };

  const handleRenewPolicy = async () => {
    if (!policy) return;
    setRenewing(true);
    try {
      await renewPolicy(policy.id, {
        premiumAmount: renewalPremium,
      });
      setRenewModalVisible(false);
    } catch (err) {
      console.warn('Renew policy error:', err);
    } finally {
      setRenewing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePolicy(policyId);
      setDeleteModalVisible(false);
      navigation.goBack();
    } catch (err) {
      console.warn('Delete policy error:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleMarkPaymentPaid = async () => {
    if (!selectedPayment) return;
    setPaying(true);
    try {
      await markPaymentPaid(selectedPayment.id);
      setPayModalVisible(false);
      setSelectedPayment(null);
    } catch (err) {
      console.warn('Mark paid error:', err);
    } finally {
      setPaying(false);
    }
  };

  if (!policy) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Policy Details" onBack={() => navigation.goBack()} />
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>Policy not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case POLICY_STATUSES.ACTIVE:
        return 'success';
      case POLICY_STATUSES.EXPIRED:
        return 'neutral';
      case POLICY_STATUSES.CANCELLED:
        return 'danger';
      case POLICY_STATUSES.MATURED:
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Policy Details"
        onBack={() => navigation.goBack()}
        rightIcon="create-outline"
        onRightPress={() => navigation.navigate('EditPolicy', { policyId: policy.id })}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Main Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Badge
              label={policy.policyType || 'Life Insurance'}
              variant="default"
              size="medium"
            />
            <Badge
              label={policy.status || 'Active'}
              variant={getStatusVariant(policy.status)}
              size="medium"
            />
          </View>

          <Text style={styles.policyTitle}>{policy.policyName}</Text>
          <Text style={styles.companyTitle}>
            {policy.companyName} {policy.policyNumber ? `• Policy #${policy.policyNumber}` : ''}
          </Text>

          <View style={styles.divider} />

          {/* Premium & Next Due Highlight */}
          <View style={styles.highlightRow}>
            <View>
              <Text style={styles.highlightLabel}>
                {isAnnual ? 'Annual Premium' : 'Recurring Premium'}
              </Text>
              <Text style={styles.premiumValue}>
                {formatCurrency(policy.premiumAmount)}
                <Text style={styles.freqText}> / {policy.paymentFrequency}</Text>
              </Text>
            </View>

            {policy.sumAssured ? (
              <View>
                <Text style={styles.highlightLabel}>
                  {getCoverageShortLabel(policy.policyType)}
                </Text>
                <Text style={[styles.premiumValue, { color: colors.success }]}>
                  {formatSumAssured(policy.sumAssured)}
                </Text>
              </View>
            ) : null}

            <View style={styles.alignRight}>
              <Text style={styles.highlightLabel}>
                {isAnnual ? 'Renewal Due' : 'Next Due Date'}
              </Text>
              <Text style={styles.dueDateValue}>
                {formatDisplayDate(policy.nextDueDate || policy.endDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Premium Payment Summary Widgets (Total Paid & Total Remaining) */}
        <View style={styles.summaryWidgetsRow}>
          {/* Total Premium Paid Widget */}
          <View style={[styles.summaryWidgetCard, styles.paidWidgetCard]}>
            <View style={styles.widgetHeader}>
              <View style={[styles.widgetIconBg, { backgroundColor: colors.successLight }]}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              </View>
              <Badge
                label={`${paidPayments.length} Paid`}
                variant="success"
                size="small"
              />
            </View>
            <Text style={styles.widgetTitle}>Total Premium Paid</Text>
            <Text
              style={[styles.widgetValue, styles.widgetValuePaid]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatCurrency(totalPremiumPaid)}
            </Text>
            <Text style={styles.widgetSubtext} numberOfLines={1}>
              {totalExpectedPremium > 0
                ? `${percentPaid}% completed`
                : '0 installments recorded'}
            </Text>
          </View>

          {/* Total Premium Remaining to Pay Widget */}
          <View style={[styles.summaryWidgetCard, styles.remainingWidgetCard]}>
            <View style={styles.widgetHeader}>
              <View style={[styles.widgetIconBg, { backgroundColor: colors.warningLight }]}>
                <Ionicons name="time" size={18} color={colors.warning} />
              </View>
              <Badge
                label={`${remainingPayments.length} Left`}
                variant="warning"
                size="small"
              />
            </View>
            <Text style={styles.widgetTitle}>Remaining to Pay</Text>
            <Text
              style={[styles.widgetValue, styles.widgetValueRemaining]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatCurrency(totalPremiumRemaining)}
            </Text>
            <Text style={styles.widgetSubtext} numberOfLines={1}>
              {totalExpectedPremium > 0
                ? `${100 - percentPaid}% remaining`
                : `${policy.durationYears || 1} yr duration`}
            </Text>
          </View>
        </View>

        {isAnnual ? (
          <>
            {/* Annual Renewal Card for Health & Vehicle Policies */}
            <View style={styles.renewalHeroCard}>
              <View style={styles.renewalHeaderRow}>
                <View style={styles.renewalTitleRow}>
                  <View style={styles.renewalIconBg}>
                    <Ionicons name={isVehicle ? "car-sport" : "medical"} size={20} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.cardHeader}>Annual Policy Renewal</Text>
                    <Text style={styles.renewalSubheader}>
                      {isVehicle ? '1-Year Renewable Vehicle Policy' : '1-Year Renewable Health Contract'}
                    </Text>
                  </View>
                </View>
                <Badge
                  label={
                    daysToRenewal != null && daysToRenewal < 0 && Math.abs(daysToRenewal) <= 30
                      ? 'Grace Period'
                      : daysToRenewal != null && daysToRenewal <= 0
                      ? 'Renewal Due'
                      : 'Active'
                  }
                  variant={
                    daysToRenewal != null && daysToRenewal < 0 && Math.abs(daysToRenewal) <= 30
                      ? 'warning'
                      : daysToRenewal != null && daysToRenewal <= 0
                      ? 'danger'
                      : 'success'
                  }
                  size="small"
                />
              </View>

              {/* Current Active Period & Renewal Due */}
              <View style={styles.renewalDatesBox}>
                <View style={styles.renewalDateCol}>
                  <Text style={styles.renewalDateLabel}>Current Coverage</Text>
                  <Text style={styles.renewalDateValue}>
                    {formatDisplayDate(policy.startDate)} – {formatDisplayDate(policy.endDate)}
                  </Text>
                </View>
                <View style={styles.renewalDateColRight}>
                  <Text style={styles.renewalDateLabel}>Next Renewal Due</Text>
                  <Text style={[styles.renewalDateValue, { color: colors.primaryDark }]}>
                    {formatDisplayDate(policy.nextDueDate || policy.endDate)}
                  </Text>
                </View>
              </View>

              {/* Countdown / Status banner */}
              <View
                style={[
                  styles.countdownBanner,
                  daysToRenewal != null && daysToRenewal <= 30 ? styles.countdownBannerUrgent : null,
                ]}
              >
                <Ionicons
                  name={daysToRenewal != null && daysToRenewal <= 30 ? 'alert-circle' : 'time-outline'}
                  size={18}
                  color={daysToRenewal != null && daysToRenewal <= 30 ? colors.warning : colors.primary}
                />
                <Text style={styles.countdownBannerText}>
                  {daysToRenewal != null && daysToRenewal < 0 && Math.abs(daysToRenewal) <= 30
                    ? `30-Day Grace Period Active • Expired ${Math.abs(daysToRenewal)} day${Math.abs(daysToRenewal) === 1 ? '' : 's'} ago`
                    : daysToRenewal != null && daysToRenewal === 0
                    ? 'Renewal Due Today'
                    : daysToRenewal != null && daysToRenewal > 0
                    ? `Renewal Due in ${daysToRenewal} day${daysToRenewal === 1 ? '' : 's'}`
                    : 'Policy Expired'}
                </Text>
              </View>

              {/* Regulatory & Continuity Notice */}
              {isVehicle ? (
                <View style={styles.continuityNotice}>
                  <Text style={styles.continuityNoticeText}>
                    🚗 <Text style={{ fontWeight: '700' }}>Motor Vehicles Act Compliance:</Text> Driving with valid insurance is mandatory under law. Renew before expiry to avoid vehicle inspection hassles and penalty risks.
                  </Text>
                </View>
              ) : (
                <View style={styles.continuityNotice}>
                  <Text style={styles.continuityNoticeText}>
                    🛡️ <Text style={{ fontWeight: '700' }}>IRDAI Continuity Benefit:</Text> Renew annually within the 30-day grace period to retain waiting period credits for pre-existing diseases.
                  </Text>
                </View>
              )}

              {/* Renew Policy Action Button */}
              <Button
                title={isVehicle ? "Renew Vehicle Policy" : "Renew Policy for Next Year"}
                icon={<Ionicons name="refresh-circle-outline" size={20} color={colors.textInverse} />}
                onPress={handleOpenRenewModal}
                size="medium"
                style={styles.renewBtn}
              />

              {/* Renewal & Payment History (Collapsible) */}
              {policyPayments.length > 0 && (
                <View style={styles.renewalHistorySection}>
                  <TouchableOpacity
                    style={styles.renewalHistoryToggle}
                    onPress={() => setRenewalHistoryExpanded((prev) => !prev)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.renewalHistoryToggleText}>
                      Renewal & Payment History ({paidPayments.length} Paid)
                    </Text>
                    <Ionicons
                      name={renewalHistoryExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.primary}
                    />
                  </TouchableOpacity>

                  {renewalHistoryExpanded && (
                    <View style={styles.renewalHistoryList}>
                      {policyPayments.map((pmt) => (
                        <PaymentCard
                          key={pmt.id}
                          payment={pmt}
                          onMarkPaid={(p) => {
                            setSelectedPayment(p);
                            setPayModalVisible(true);
                          }}
                        />
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Health-Specific: Covered Family Members & TPA Details */}
            {isHealth ? (
              <>
                {/* Covered Family Members Card (Phase 2) */}
                <View style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardHeaderIconRow}>
                      <Ionicons name="people" size={20} color={colors.primary} />
                      <Text style={styles.cardHeader}>
                        Covered Family Members ({policy.coveredMembers?.length || 0})
                      </Text>
                    </View>
                    <Badge label="Family Floater" variant="info" size="small" />
                  </View>

                  {policy.coveredMembers && policy.coveredMembers.length > 0 ? (
                    <View style={styles.membersList}>
                      {policy.coveredMembers.map((member, idx) => (
                        <View key={member.id || idx} style={styles.memberCardItem}>
                          <View style={styles.memberAvatar}>
                            <Ionicons name="person" size={16} color={colors.primary} />
                          </View>
                          <View style={styles.memberMetaCol}>
                            <Text style={styles.memberNameText}>{member.name}</Text>
                            <View style={styles.memberPillsRow}>
                              <View style={styles.relationPill}>
                                <Text style={styles.relationPillText}>{member.relation || 'Member'}</Text>
                              </View>
                              {member.age ? (
                                <Text style={styles.memberAgeText}>{member.age} Years</Text>
                              ) : null}
                              {member.memberId ? (
                                <Text style={styles.memberIdText}>• ID: {member.memberId}</Text>
                              ) : null}
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyMembersCard}>
                      <Ionicons name="person-add-outline" size={24} color={colors.textMuted} />
                      <Text style={styles.emptyMembersCardText}>
                        No family members added yet. Tap "Edit Policy Details" to list covered members.
                      </Text>
                    </View>
                  )}
                </View>

                {/* TPA Details Card */}
                <View style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardHeaderIconRow}>
                      <Ionicons name="business" size={20} color={colors.primary} />
                      <Text style={styles.cardHeader}>TPA Details</Text>
                    </View>
                    <Badge label="Claims Support" variant="info" size="small" />
                  </View>

                  <View style={styles.tpaContent}>
                    <View style={styles.tpaFieldRow}>
                      <Text style={styles.tpaFieldLabel}>TPA Name</Text>
                      <Text style={styles.tpaFieldValue}>
                        {policy.tpaName || 'In-House Claims Desk / Not specified'}
                      </Text>
                    </View>

                    <View style={styles.tpaAdviceBox}>
                      <Text style={styles.tpaAdviceText}>
                        🏥 <Text style={{ fontWeight: '700' }}>Hospital Admission Tip:</Text> Present your Policy Number or Member ID at the hospital TPA desk within 2 hours of planned admission or 24 hours of emergency admission.
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            ) : null}
          </>
        ) : (
          <>
            {/* Term & Remaining Duration Card for Non-Annual Policies (LIC, HDFC, Bajaj) */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Policy Duration & Timeline</Text>

              <View style={styles.durationBanner}>
                <Ionicons name="time-outline" size={24} color={colors.primary} />
                <View style={styles.durationTextArea}>
                  <Text style={styles.durationBannerLabel}>Remaining Duration</Text>
                  <Text
                    style={[
                      styles.durationBannerValue,
                      remainingDurationText === 'Policy expired' && styles.expiredText,
                    ]}
                  >
                    {remainingDurationText}
                  </Text>
                </View>
              </View>

              <View style={styles.gridRow}>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Start Date</Text>
                  <Text style={styles.gridValue}>{formatDisplayDate(policy.startDate)}</Text>
                </View>

                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>End Date</Text>
                  <Text style={styles.gridValue}>{formatDisplayDate(policy.endDate)}</Text>
                </View>

                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Policy Term</Text>
                  <Text style={styles.gridValue}>
                    {policy.policyTermYears || policy.durationYears} {Number(policy.policyTermYears || policy.durationYears) === 1 ? 'Year' : 'Years'}
                  </Text>
                </View>

                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Paying Term</Text>
                  <Text style={styles.gridValue}>
                    {policy.premiumPayingTerm || policy.durationYears} {Number(policy.premiumPayingTerm || policy.durationYears) === 1 ? 'Year' : 'Years'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Payment Schedule & History Section (Collapsible by default) */}
            <View style={styles.paymentsSection}>
              <TouchableOpacity
                style={styles.scheduleHeaderToggle}
                onPress={() => setScheduleExpanded((prev) => !prev)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Installment Schedule (${policyPayments.length}), ${scheduleExpanded ? 'Tap to collapse' : 'Tap to expand'}`}
              >
                <View style={styles.scheduleHeaderLeft}>
                  <Ionicons
                    name="calendar-outline"
                    size={22}
                    color={colors.primary}
                    style={styles.scheduleHeaderIcon}
                  />
                  <View style={styles.scheduleTitleCol}>
                    <Text style={styles.sectionTitle}>
                      Installment Schedule ({policyPayments.length})
                    </Text>
                    <Text style={styles.scheduleHintText}>
                      {scheduleExpanded
                        ? 'Tap to collapse'
                        : `Tap to view ${policyPayments.length} installment${policyPayments.length === 1 ? '' : 's'}`}
                    </Text>
                  </View>
                </View>

                <View style={styles.scheduleToggleBadge}>
                  <Text style={styles.scheduleToggleText}>
                    {scheduleExpanded ? 'Hide' : 'View'}
                  </Text>
                  <Ionicons
                    name={scheduleExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.primaryDark}
                  />
                </View>
              </TouchableOpacity>

              {scheduleExpanded ? (
                <View style={styles.scheduleContent}>
                  {policyPayments.length === 0 ? (
                    <View style={styles.emptyPayments}>
                      <Text style={styles.emptyPaymentsText}>
                        No installments recorded for this policy.
                      </Text>
                    </View>
                  ) : (
                    policyPayments.map((pmt) => (
                      <PaymentCard
                        key={pmt.id}
                        payment={pmt}
                        onMarkPaid={(p) => {
                          setSelectedPayment(p);
                          setPayModalVisible(true);
                        }}
                      />
                    ))
                  )}
                </View>
              ) : null}
            </View>
          </>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <Button
            title="Edit Policy Details"
            variant="outline"
            onPress={() => navigation.navigate('EditPolicy', { policyId: policy.id })}
            icon={<Ionicons name="create-outline" size={18} color={colors.primary} />}
            style={styles.actionBtn}
          />

          <Button
            title="Delete Policy"
            variant="danger"
            onPress={() => setDeleteModalVisible(true)}
            icon={<Ionicons name="trash-outline" size={18} color={colors.textInverse} />}
            style={styles.actionBtn}
          />
        </View>
      </ScrollView>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={deleteModalVisible}
        title="Delete Policy?"
        message="Are you sure you want to delete this policy? This will permanently delete the policy and all associated payment installments."
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalVisible(false)}
      />

      {/* Mark Paid Confirmation Dialog */}
      <ConfirmDialog
        visible={payModalVisible}
        title="Mark as Paid"
        message={
          selectedPayment
            ? `Confirm receipt of ${formatCurrency(selectedPayment.amount)} for installment #${selectedPayment.installmentNumber || 1}?`
            : 'Mark payment as paid?'
        }
        confirmText="Confirm Paid"
        confirmVariant="primary"
        loading={paying}
        onConfirm={handleMarkPaymentPaid}
        onCancel={() => {
          setPayModalVisible(false);
          setSelectedPayment(null);
        }}
      />

      {/* Annual Policy Renewal Modal */}
      <Modal
        visible={renewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.renewModalContainer}>
            <View style={styles.renewModalHeader}>
              <View style={styles.renewModalIconBg}>
                <Ionicons name={isVehicle ? "car-sport" : "refresh-circle"} size={26} color={colors.primary} />
              </View>
              <View style={styles.renewModalHeaderTextCol}>
                <Text style={styles.renewModalTitle}>
                  {isVehicle ? 'Renew Vehicle Policy' : 'Renew Mediclaim Policy'}
                </Text>
                <Text style={styles.renewModalSubtitle}>
                  {isVehicle ? 'Advance vehicle insurance coverage for the next policy year' : 'Advance coverage for the next policy year'}
                </Text>
              </View>
            </View>

            {/* Coverage Date Transition Preview */}
            <View style={styles.renewDatesBox}>
              <View style={styles.renewDateItem}>
                <Text style={styles.renewDateLabel}>New Start Date</Text>
                <Text style={styles.renewDateValue}>
                  {formatDisplayDate(policy.endDate || policy.startDate)}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
              <View style={styles.renewDateItem}>
                <Text style={styles.renewDateLabel}>New End Date</Text>
                <Text style={styles.renewDateValue}>
                  {formatDisplayDate(calculateEndDate(policy.endDate || policy.startDate, 1))}
                </Text>
              </View>
            </View>

            <Input
              label="Renewal Premium (₹)"
              value={renewalPremium}
              onChangeText={(t) => {
                const cleaned = t.replace(/[^0-9]/g, '').slice(0, 8);
                setRenewalPremium(cleaned);
              }}
              keyboardType="numeric"
              maxLength={8}
              placeholder="e.g. 18500"
              leftIcon={<Text style={styles.currencyPrefix}>₹</Text>}
              required
            />


            <View style={styles.renewModalActions}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setRenewModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Confirm & Renew"
                loading={renewing}
                onPress={handleRenewPolicy}
                disabled={!renewalPremium.trim()}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  policyTitle: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  companyTitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  highlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  highlightLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  premiumValue: {
    ...typography.subtitle,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  freqText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  dueDateValue: {
    ...typography.subtitle,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryWidgetsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryWidgetCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  paidWidgetCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  remainingWidgetCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  widgetIconBg: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  widgetValue: {
    ...typography.h3,
    fontWeight: '700',
    marginTop: 4,
  },
  widgetValuePaid: {
    color: colors.success,
  },
  widgetValueRemaining: {
    color: colors.textPrimary,
  },
  widgetSubtext: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    ...typography.subtitle,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  durationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  durationTextArea: {
    flex: 1,
  },
  durationBannerLabel: {
    ...typography.captionBold,
    color: colors.primaryDark,
  },
  durationBannerValue: {
    ...typography.subtitle,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: 2,
  },
  expiredText: {
    color: colors.danger,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridItem: {
    flex: 1,
  },
  gridLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  gridValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  paymentsSection: {
    marginTop: spacing.md,
  },
  scheduleHeaderToggle: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  scheduleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  scheduleHeaderIcon: {
    marginRight: 2,
  },
  scheduleTitleCol: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  scheduleHintText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  scheduleToggleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  scheduleToggleText: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 10,
  },
  scheduleContent: {
    marginTop: spacing.sm,
  },
  emptyPayments: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyPaymentsText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  actionsSection: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  actionBtn: {
    marginBottom: spacing.xs,
  },
  renewalHeroCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  renewalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  renewalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  renewalIconBg: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renewalSubheader: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  renewalDatesBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  renewalDateCol: {
    flex: 1,
  },
  renewalDateColRight: {
    alignItems: 'flex-end',
  },
  renewalDateLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  renewalDateValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  countdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  countdownBannerUrgent: {
    backgroundColor: colors.warningLight,
  },
  countdownBannerText: {
    ...typography.captionBold,
    color: colors.primaryDark,
    flex: 1,
  },
  continuityNotice: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  continuityNoticeText: {
    ...typography.caption,
    color: '#166534',
    lineHeight: 18,
  },
  renewBtn: {
    marginBottom: spacing.md,
  },
  renewalHistorySection: {
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  renewalHistoryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  renewalHistoryToggleText: {
    ...typography.captionBold,
    color: colors.primary,
  },
  renewalHistoryList: {
    marginTop: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardHeaderIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  membersList: {
    gap: spacing.sm,
  },
  memberCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberMetaCol: {
    flex: 1,
  },
  memberNameText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  memberPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },
  relationPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  relationPillText: {
    ...typography.captionBold,
    fontSize: 10,
    color: colors.primaryDark,
  },
  memberAgeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
  },
  memberIdText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
  },
  emptyMembersCard: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: spacing.xs,
  },
  emptyMembersCardText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  tpaContent: {
    gap: spacing.sm,
  },
  tpaFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  tpaFieldLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  tpaFieldValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  tpaAdviceBox: {
    backgroundColor: colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  tpaAdviceText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  renewModalContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 440,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  renewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  renewModalIconBg: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renewModalHeaderTextCol: {
    flex: 1,
  },
  renewModalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  renewModalSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  renewDatesBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  renewDateItem: {
    flex: 1,
  },
  renewDateLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  renewDateValue: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  renewModalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  currencyPrefix: {
    ...typography.bodyBold,
    color: colors.primary,
    fontSize: 14,
  },
});
