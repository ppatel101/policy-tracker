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
import { Ionicons } from '@expo/vector-icons';
import { usePolicies } from '../../context/PolicyContext';
import { PaymentCard } from '../../components/PaymentCard';
import { Input } from '../../components/Input';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { OfflineBanner } from '../../components/OfflineBanner';
import { formatCurrency } from '../../utils/currencyUtils';
import { getDueStatus } from '../../utils/dateUtils';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { PAYMENT_STATUSES } from '../../utils/constants';

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'due_soon', label: 'Due Soon' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'paid', label: 'Paid' },
];

export const PaymentsScreen = ({ navigation }) => {
  const { payments, markPaymentPaid, refreshing, loadData } = usePolicies();

  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'all'
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedPayment, setSelectedPayment] = useState(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const filteredPayments = useMemo(() => {
    let list = [...payments];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const name = (p.policyName || '').toLowerCase();
        const company = (p.companyName || '').toLowerCase();
        return name.includes(q) || company.includes(q);
      });
    }

    // Filter by tab/status
    if (activeFilter !== 'all') {
      list = list.filter((p) => {
        const status = getDueStatus(p.dueDate, p.status);
        return status === activeFilter;
      });
    } else if (activeTab === 'upcoming') {
      list = list.filter((p) => p.status !== PAYMENT_STATUSES.PAID);
    }

    // Sort order
    if (activeTab === 'upcoming') {
      // Earliest due date first
      return list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    } else {
      // Newest first
      return list.sort((a, b) => {
        const dateA = a.paidDate || a.dueDate;
        const dateB = b.paidDate || b.dueDate;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
    }
  }, [payments, activeTab, activeFilter, searchQuery]);

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
      console.warn('Mark payment paid error:', err);
    } finally {
      setMarkingPaid(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <OfflineBanner />

      {/* Screen Title */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Premium Payments</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('PaymentHistory')}
          style={styles.historyLink}
        >
          <Ionicons name="time-outline" size={18} color={colors.primary} />
          <Text style={styles.historyLinkText}>History</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <Input
          placeholder="Search payments by policy or insurer..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Ionicons name="search-outline" size={18} color={colors.textMuted} />}
          rightIcon={
            searchQuery ? (
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            ) : null
          }
          onRightIconPress={() => setSearchQuery('')}
          containerStyle={styles.searchBar}
        />
      </View>

      {/* Segment Tabs: Upcoming vs All */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setActiveTab('upcoming');
            setActiveFilter('all');
          }}
          style={[styles.segmentBtn, activeTab === 'upcoming' && styles.segmentBtnActive]}
        >
          <Text style={[styles.segmentBtnText, activeTab === 'upcoming' && styles.segmentBtnTextActive]}>
            Upcoming Due
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setActiveTab('all');
            setActiveFilter('all');
          }}
          style={[styles.segmentBtn, activeTab === 'all' && styles.segmentBtnActive]}
        >
          <Text style={[styles.segmentBtnText, activeTab === 'all' && styles.segmentBtnTextActive]}>
            All Payments
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sub-filter chips */}
      <View style={styles.filtersRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_TABS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isSelected = activeFilter === item.id;
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setActiveFilter(item.id)}
                style={[styles.chip, isSelected && styles.chipActive]}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Payments List */}
      <FlatList
        data={filteredPayments}
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
            icon="card-outline"
            title={
              activeFilter !== 'all' || searchQuery
                ? 'No matching payments'
                : activeTab === 'upcoming'
                ? 'No upcoming payments'
                : 'No payments recorded'
            }
            description={
              activeFilter !== 'all' || searchQuery
                ? 'Try changing the status filter or clearing your search.'
                : 'Your upcoming policy premium installments will appear here.'
            }
          />
        }
      />

      {/* Mark Paid Confirmation Modal */}
      <ConfirmDialog
        visible={confirmModalVisible}
        title="Confirm Payment"
        message={
          selectedPayment
            ? `Mark installment of ${formatCurrency(selectedPayment.amount)} for ${selectedPayment.policyName || 'this policy'} as paid?`
            : 'Confirm payment?'
        }
        confirmText="Mark as Paid"
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: spacing.xs,
  },
  historyLinkText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  searchSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  searchBar: {
    marginBottom: spacing.xs,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.lg,
    padding: 3,
    marginBottom: spacing.sm,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  segmentBtnActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  segmentBtnTextActive: {
    color: colors.primary,
  },
  filtersRow: {
    marginBottom: spacing.sm,
  },
  filterList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 12,
  },
  chipTextActive: {
    color: colors.textInverse,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
  },
});
