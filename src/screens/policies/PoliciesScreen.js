import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePolicies } from '../../context/PolicyContext';
import { PolicyCard } from '../../components/PolicyCard';
import { Input } from '../../components/Input';
import { EmptyState } from '../../components/EmptyState';
import { OfflineBanner } from '../../components/OfflineBanner';
import { policyService } from '../../services/policyService';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { POLICY_FILTERS, SORT_OPTIONS } from '../../utils/constants';

export const PoliciesScreen = ({ navigation }) => {
  const { policies, loading, refreshing, loadData } = usePolicies();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeSort, setActiveSort] = useState('next_due_date');
  const [sortModalVisible, setSortModalVisible] = useState(false);

  // Filtered and sorted policies
  const processedPolicies = useMemo(() => {
    // 1. Search
    const searched = policyService.searchPolicies(policies, searchQuery);
    // 2. Filter
    const filtered = policyService.filterPolicies(searched, activeFilter);
    // 3. Sort
    return policyService.sortPolicies(filtered, activeSort);
  }, [policies, searchQuery, activeFilter, activeSort]);

  const currentSortLabel = SORT_OPTIONS.find((s) => s.id === activeSort)?.label || 'Sort';

  return (
    <SafeAreaView style={styles.safeArea}>
      <OfflineBanner />

      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>All Policies</Text>
          <Text style={styles.headerSubtitle}>
            {policies.length} {policies.length === 1 ? 'policy' : 'policies'} recorded
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('AddPolicy')}
          style={styles.addBtn}
          accessibilityRole="button"
          accessibilityLabel="Add Policy"
        >
          <Ionicons name="add" size={18} color={colors.textInverse} />
          <Text style={styles.addBtnText}>Add Policy</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Search by name, company, or policy #..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Ionicons name="search-outline" size={20} color={colors.textMuted} />}
          rightIcon={
            searchQuery ? (
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            ) : null
          }
          onRightIconPress={() => setSearchQuery('')}
          containerStyle={styles.searchBar}
        />
      </View>

      {/* Filter Tabs & Sort Button */}
      <View style={styles.controlsRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={POLICY_FILTERS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => {
            const isSelected = activeFilter === item.id;
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setActiveFilter(item.id)}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setSortModalVisible(true)}
          style={styles.sortButton}
          accessibilityRole="button"
          accessibilityLabel="Sort policies"
        >
          <Ionicons name="swap-vertical-outline" size={16} color={colors.textPrimary} />
          <Text style={styles.sortButtonText}>{currentSortLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* Active Filter Indicator & Clear Filter Button */}
      {(activeFilter !== 'all' || searchQuery.trim() !== '') && (
        <View style={styles.activeFilterRow}>
          <View style={styles.activeFilterInfo}>
            <Ionicons name="filter-outline" size={14} color={colors.primary} />
            <Text style={styles.activeFilterText} numberOfLines={1}>
              {activeFilter !== 'all'
                ? `Filter: ${POLICY_FILTERS.find((f) => f.id === activeFilter)?.label || activeFilter}`
                : ''}
              {activeFilter !== 'all' && searchQuery.trim() ? ' • ' : ''}
              {searchQuery.trim() ? `Search: "${searchQuery.trim()}"` : ''}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setActiveFilter('all');
              setSearchQuery('');
            }}
            style={styles.clearFiltersBtn}
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
          >
            <Ionicons name="close-circle-outline" size={15} color={colors.danger} />
            <Text style={styles.clearFiltersBtnText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Policy List */}
      <FlatList
        data={processedPolicies}
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
          <PolicyCard
            policy={item}
            onPress={() => navigation.navigate('PolicyDetails', { policyId: item.id })}
          />
        )}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="shield-outline"
              title={searchQuery || activeFilter !== 'all' ? 'No matching policies' : 'No policies yet'}
              description={
                searchQuery || activeFilter !== 'all'
                  ? 'Try adjusting your search terms or filter selection.'
                  : 'Add your first policy to start tracking premiums and renewal dates.'
              }
              buttonTitle={!searchQuery && activeFilter === 'all' ? 'Add Policy' : 'Clear Filters'}
              buttonIcon={
                !searchQuery && activeFilter === 'all' ? (
                  <Ionicons name="add-circle-outline" size={18} color={colors.textInverse} />
                ) : (
                  <Ionicons name="close-circle-outline" size={18} color={colors.primary} />
                )
              }
              buttonVariant={!searchQuery && activeFilter === 'all' ? 'primary' : 'outline'}
              onButtonPress={() => {
                if (!searchQuery && activeFilter === 'all') {
                  navigation.navigate('AddPolicy');
                } else {
                  setSearchQuery('');
                  setActiveFilter('all');
                }
              }}
            />
          )
        }
      />

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate('AddPolicy')}
        style={styles.fab}
        accessibilityRole="button"
        accessibilityLabel="Add New Policy"
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      {/* Sort Options Modal */}
      <Modal
        visible={sortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSortModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort Policies By</Text>
              <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {SORT_OPTIONS.map((opt) => {
              const isSelected = activeSort === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  activeOpacity={0.7}
                  onPress={() => {
                    setActiveSort(opt.id);
                    setSortModalVisible(false);
                  }}
                  style={[styles.sortOptionItem, isSelected && styles.sortOptionSelected]}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      isSelected && styles.sortOptionTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  addBtnText: {
    ...typography.bodyBold,
    color: colors.textInverse,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  searchBar: {
    marginBottom: spacing.xs,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  filtersList: {
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.textInverse,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  sortButtonText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 10,
  },
  activeFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
  },
  activeFilterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    paddingRight: spacing.xs,
  },
  activeFilterText: {
    ...typography.captionBold,
    color: colors.primaryDark,
    fontSize: 10,
  },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
  },
  clearFiltersBtnText: {
    ...typography.captionBold,
    color: colors.danger,
    fontSize: 10,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 90,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  sortOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sortOptionSelected: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  sortOptionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  sortOptionTextSelected: {
    ...typography.bodyBold,
    color: colors.primary,
  },
});
