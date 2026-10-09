import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { formatDisplayDate } from '../../utils/dateUtils';
import { validatePhone } from '../../utils/validation';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

export const ProfileScreen = ({ navigation }) => {
  const { user, profile, updateProfile, signOut } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [phoneError, setPhoneError] = useState(null);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    setMessage('');
    const pErr = validatePhone(phone);
    if (pErr) {
      setPhoneError(pErr);
      return;
    }
    setPhoneError(null);

    setSaving(true);
    try {
      const res = await updateProfile({ fullName, phone });
      if (res.error) {
        setMessage(res.error);
      } else {
        setIsEditing(false);
        setMessage('Profile updated successfully.');
      }
    } catch (e) {
      setMessage('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name = 'User') => {
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';
  };

  const displayName = profile?.fullName || user?.user_metadata?.full_name || 'Policyholder';
  const displayEmail = profile?.email || user?.email || 'N/A';
  const memberSince = user?.created_at ? formatDisplayDate(user.created_at) : 'Active User';

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Profile"
        rightIcon="settings-outline"
        onRightPress={() => navigation.navigate('Settings')}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Avatar & Header */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{getInitials(displayName)}</Text>
            </View>
            <Text style={styles.displayName}>{displayName}</Text>
            <Text style={styles.displayEmail}>{displayEmail}</Text>
            <View style={styles.badgeJoined}>
              <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.joinedText}>Member since {memberSince}</Text>
            </View>
          </View>

          {message ? (
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle" size={18} color={colors.primary} />
              <Text style={styles.infoBannerText}>{message}</Text>
            </View>
          ) : null}

          {/* Profile Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Personal Information</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsEditing(!isEditing)}
              >
                <Text style={styles.editToggleText}>
                  {isEditing ? 'Cancel' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>

            {isEditing ? (
              <View style={styles.formArea}>
                <Input
                  label="Full Name"
                  value={fullName}
                  onChangeText={setFullName}
                  leftIcon={<Ionicons name="person-outline" size={18} color={colors.textMuted} />}
                  required
                />

                <Input
                  label="Phone Number"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    if (phoneError) setPhoneError(null);
                  }}
                  keyboardType="phone-pad"
                  leftIcon={<Ionicons name="call-outline" size={18} color={colors.textMuted} />}
                  error={phoneError}
                />

                <Button
                  title="Save Changes"
                  onPress={handleSaveProfile}
                  loading={saving}
                  variant="primary"
                  size="medium"
                  style={styles.saveBtn}
                />
              </View>
            ) : (
              <View style={styles.detailsList}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Full Name</Text>
                  <Text style={styles.detailValue}>{displayName}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{displayEmail}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{profile?.phone || 'Not provided'}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Quick Links Menu */}
          <View style={styles.menuCard}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Settings')}
              style={styles.menuItem}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="options-outline" size={20} color={colors.primary} />
                <Text style={styles.menuLabel}>Settings & Preferences</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('PaymentHistory')}
              style={styles.menuItem}
            >
              <View style={styles.menuLeft}>
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <Text style={styles.menuLabel}>Payment Records</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <Button
            title="Log Out"
            variant="outline"
            onPress={() => setLogoutModalVisible(true)}
            icon={<Ionicons name="log-out-outline" size={18} color={colors.primary} />}
            style={styles.logoutBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={logoutModalVisible}
        title="Log Out"
        message="Are you sure you want to log out? Local data will be cleared from cache."
        confirmText="Log Out"
        confirmVariant="danger"
        onConfirm={async () => {
          setLogoutModalVisible(false);
          await signOut();
        }}
        onCancel={() => setLogoutModalVisible(false)}
      />
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
  avatarSection: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarInitials: {
    ...typography.h1,
    color: colors.textInverse,
    fontWeight: '700',
  },
  displayName: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  displayEmail: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgeJoined: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
    gap: 4,
  },
  joinedText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  infoBannerText: {
    ...typography.captionBold,
    color: colors.primaryDark,
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.subtitle,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  editToggleText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  formArea: {
    marginTop: spacing.xs,
  },
  saveBtn: {
    marginTop: spacing.sm,
  },
  detailsList: {
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  detailValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  menuLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  logoutBtn: {
    marginTop: spacing.sm,
  },
});
