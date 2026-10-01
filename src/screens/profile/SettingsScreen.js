import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { usePolicies } from '../../context/PolicyContext';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { localStorage } from '../../storage/localStorage';
import { authService } from '../../services/authService';
import { formatDisplayDate } from '../../utils/dateUtils';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

export const SettingsScreen = ({ navigation }) => {
  const { user, signOut } = useAuth();
  const { lastSyncTime, manualSync, syncing } = usePolicies();

  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    reminderDaysBefore: 7,
    reminderDayBefore: true,
    reminderOnDueDate: true,
    currency: 'INR',
    theme: 'light',
  });

  const [pendingOpsCount, setPendingOpsCount] = useState(0);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    async function loadSettings() {
      const s = await localStorage.getSettings();
      if (s) setSettings(s);
      const ops = await localStorage.getPendingSyncOperations();
      setPendingOpsCount(ops.length);
    }
    loadSettings();
  }, []);

  const updateSetting = async (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await localStorage.setSettings(updated);
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setDeletingAccount(true);
    try {
      const res = await authService.deleteAccount(user?.id);
      if (res.error) {
        setDeleteError(res.error);
        setDeletingAccount(false);
      } else {
        setDeleteAccountModalVisible(false);
      }
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account');
      setDeletingAccount(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Settings & Preferences"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {deleteError ? (
          <View style={styles.errorAlert}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorAlertText}>{deleteError}</Text>
          </View>
        ) : null}

        {/* Section: Notifications */}
        <Text style={styles.sectionHeader}>Notification Reminders</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabelArea}>
              <Text style={styles.switchTitle}>Enable Notifications</Text>
              <Text style={styles.switchSubtitle}>
                Get local alerts for upcoming policy premiums
              </Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(val) => updateSetting('notificationsEnabled', val)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          {settings.notificationsEnabled && (
            <>
              <View style={styles.divider} />

              <View style={styles.subOptionRow}>
                <Text style={styles.subOptionTitle}>7 Days Before Due Date</Text>
                <Switch
                  value={settings.reminderDaysBefore === 7}
                  onValueChange={(val) => updateSetting('reminderDaysBefore', val ? 7 : 3)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.surface}
                />
              </View>

              <View style={styles.subOptionRow}>
                <Text style={styles.subOptionTitle}>1 Day Before Due Date</Text>
                <Switch
                  value={settings.reminderDayBefore !== false}
                  onValueChange={(val) => updateSetting('reminderDayBefore', val)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.surface}
                />
              </View>

              <View style={styles.subOptionRow}>
                <Text style={styles.subOptionTitle}>On the Due Date</Text>
                <Switch
                  value={settings.reminderOnDueDate !== false}
                  onValueChange={(val) => updateSetting('reminderOnDueDate', val)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.surface}
                />
              </View>
            </>
          )}
        </View>

        {/* Section: Currency & Display */}
        <Text style={styles.sectionHeader}>Display & Currency</Text>
        <View style={styles.card}>
          <View style={styles.detailRow}>
            <View>
              <Text style={styles.detailTitle}>Default Currency</Text>
              <Text style={styles.detailSubtitle}>Indian Rupee (₹)</Text>
            </View>
            <View style={styles.currencyBadge}>
              <Text style={styles.currencyBadgeText}>INR (₹)</Text>
            </View>
          </View>
        </View>

        {/* Section: Storage & Sync Status */}
        <Text style={styles.sectionHeader}>Sync & Offline Storage</Text>
        <View style={styles.card}>
          <View style={styles.detailRow}>
            <View>
              <Text style={styles.detailTitle}>Last Synchronized</Text>
              <Text style={styles.detailSubtitle}>
                {lastSyncTime ? formatDisplayDate(lastSyncTime) : 'Not synced yet'}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={manualSync}
              disabled={syncing}
              style={styles.syncBtn}
            >
              <Ionicons name="sync" size={16} color={colors.primary} />
              <Text style={styles.syncBtnText}>{syncing ? 'Syncing...' : 'Sync Now'}</Text>
            </TouchableOpacity>
          </View>

          {pendingOpsCount > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.pendingRow}>
                <Ionicons name="cloud-upload-outline" size={18} color={colors.warning} />
                <Text style={styles.pendingText}>
                  {pendingOpsCount} offline change{pendingOpsCount === 1 ? '' : 's'} waiting to sync
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Section: Account & Danger Zone */}
        <Text style={[styles.sectionHeader, styles.dangerHeader]}>Account Actions</Text>
        <View style={styles.card}>
          <Button
            title="Sign Out"
            variant="secondary"
            onPress={signOut}
            icon={<Ionicons name="log-out-outline" size={18} color={colors.textPrimary} />}
            style={styles.actionBtn}
          />

          <View style={styles.divider} />

          <Button
            title="Delete Account"
            variant="danger"
            onPress={() => setDeleteAccountModalVisible(true)}
            icon={<Ionicons name="trash-outline" size={18} color={colors.textInverse} />}
            style={styles.actionBtn}
          />
        </View>
      </ScrollView>

      {/* Confirmation Dialog for Delete Account (Section 41) */}
      <ConfirmDialog
        visible={deleteAccountModalVisible}
        title="Delete Account"
        message="Deleting your account will permanently remove your policies and payment data. This action cannot be undone."
        confirmText="Permanently Delete"
        confirmVariant="danger"
        loading={deletingAccount}
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteAccountModalVisible(false)}
      />
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
  sectionHeader: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  dangerHeader: {
    color: colors.danger,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabelArea: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  switchSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  subOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  subOptionTitle: {
    ...typography.body,
    color: colors.textPrimary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  detailSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  currencyBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  currencyBadgeText: {
    ...typography.bodyBold,
    color: colors.primaryDark,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  syncBtnText: {
    ...typography.captionBold,
    color: colors.primaryDark,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pendingText: {
    ...typography.captionBold,
    color: colors.warning,
  },
  actionBtn: {
    marginVertical: spacing.xxs,
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
});
