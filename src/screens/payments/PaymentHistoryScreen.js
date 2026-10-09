import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePolicies } from '../../context/PolicyContext';
import { Header } from '../../components/Header';
import { PaymentCard } from '../../components/PaymentCard';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { formatCurrency } from '../../utils/currencyUtils';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { PAYMENT_STATUSES } from '../../utils/constants';

const HISTORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'paid', label: 'Paid' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'overdue', label: 'Overdue' },
];

export const PaymentHistoryScreen = ({ navigation }) => {
  const { payments, markPaymentPaid, refreshing, loadData } = usePolicies();

  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const historyPayments = useMemo(() => {
    let list = [...payments];

    const todayStr = new Date().toISOString().split('T')[0];

    if (activeFilter === 'paid') {
      list = list.filter((p) => p.status === PAYMENT_STATUSES.PAID);
    } else if (activeFilter === 'upcoming') {
      list = list.filter((p) => p.status !== PAYMENT_STATUSES.PAID && p.dueDate >= todayStr);
    } else if (activeFilter === 'overdue') {
      list = list.filter((p) => p.status !== PAYMENT_STATUSES.PAID && p.dueDate < todayStr);
    }

    // Sort newest first (paid_date if paid, else due_date)
    return list.sort((a, b) => {
      const dateA = a.paidDate || a.dueDate;
      const dateB = b.paidDate || b.dueDate;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [payments, activeFilter]);

  const handleOpenMarkPaid = (payment) => {
    setSelectedPayment(payment);
    setConfirmModalVisible(true);
  };

  const handleConfirmMarkPaid = async () => {
    if (!selectedPayment) return;
    setMarkingPaid(true);
    try {
      await markPaymentPaid(selectedPayment.id);
      setConfirmModalVisible(false);
      setSelectedPayment(null);
    } catch (err) {
      console.warn('Mark paid error:', err);
    } finally {
      setMarkingPaid(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Payment History"
        subtitle="Sorted newest first"
        onBack={() => navigation.goBack()}
      />

      {/* Filter Tabs */}
      <View style={styles.filtersContainer}>
        {HISTORY_FILTERS.map((f) => {
          const isSelected = activeFilter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              activeOpacity={0.7}
              onPress={() => setActiveFilter(f.id)}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isSelected && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={historyPayments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => (
          <PaymentCard
            payment={item}
            onMarkPaid={handleOpenMarkPaid}
            onPress={() => {
              if (item.policyId) {
                navigation.navigate('PolicyDetails', { policyId: item.policyId });
              }
            }}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No payment records"
            description={`No payments found under "${activeFilter}" filter.`}
          />
        }
      />

      <ConfirmDialog
        visible={confirmModalVisible}
        title="Mark Payment as Paid"
        message={
          selectedPayment
            ? `Mark installment of ${formatCurrency(selectedPayment.amount)} as paid?`
            : 'Mark payment as paid?'
        }
        confirmText="Yes, Mark Paid"
        confirmVariant="primary"
        loading={markingPaid}
        onConfirm={handleConfirmMarkPaid}
        onCancel={() => {
          setConfirmModalVisible(false);
          setSelectedPayment(null);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 10,
  },
  filterChipTextActive: {
    color: colors.textInverse,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
  },
});
