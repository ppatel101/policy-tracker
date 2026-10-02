import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing, layout } from '../theme/spacing';
import { formatDate, formatDisplayDate } from '../utils/dateUtils';

let RNDateTimePicker = null;
let DateTimePickerAndroid = null;

// Only import native picker on native platforms
if (Platform.OS === 'android' || Platform.OS === 'ios') {
  try {
    const pkg = require('@react-native-community/datetimepicker');
    RNDateTimePicker = pkg.default || pkg;
    DateTimePickerAndroid = pkg.DateTimePickerAndroid;
  } catch (e) {
    console.warn('Native DateTimePicker not available:', e?.message);
  }
}

/**
 * Safely parse date value (handles YYYY-MM-DD local timezone correctly)
 */
function parseDate(val) {
  if (!val) return new Date();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
    const parts = val.trim().split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DatePickerInput = ({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  error,
  helperText,
  required = false,
  disabled = false,
  minimumDate,
  maximumDate,
  containerStyle,
  style,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(() => parseDate(value));

  // Calendar state for Web/fallback modal
  const [viewDate, setViewDate] = useState(() => parseDate(value));

  const displayDateStr = value ? formatDisplayDate(value) : '';
  const isoDateStr = value ? (typeof value === 'string' ? value : formatDate(value)) : '';

  const handleOpenPicker = () => {
    if (disabled) return;
    const initial = parseDate(value);
    setTempDate(initial);
    setViewDate(new Date(initial.getFullYear(), initial.getMonth(), 1));

    if (Platform.OS === 'android' && DateTimePickerAndroid) {
      try {
        DateTimePickerAndroid.open({
          value: initial,
          mode: 'date',
          is24Hour: true,
          minimumDate,
          maximumDate,
          onChange: (event, selectedDate) => {
            if (event.type === 'set' && selectedDate) {
              onChange(formatDate(selectedDate));
            }
          },
        });
        return;
      } catch (err) {
        console.warn('DateTimePickerAndroid.open error:', err);
      }
    }

    setShowPicker(true);
  };

  const handleNativeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      if (Platform.OS === 'android') {
        onChange(formatDate(selectedDate));
      } else {
        setTempDate(selectedDate);
      }
    } else if (event.type === 'dismissed') {
      setShowPicker(false);
    }
  };

  const handleIosDone = () => {
    setShowPicker(false);
    onChange(formatDate(tempDate));
  };

  const handleWebDaySelect = (dayNumber) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), dayNumber, 12, 0, 0);
    onChange(formatDate(selected));
    setShowPicker(false);
  };

  const changeMonth = (delta) => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  // Calendar Grid generation for Web / fallback
  const renderCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push(
        <View key={`prev-${i}`} style={styles.calCell}>
          <Text style={styles.calCellTextMuted}>{prevMonthDays - i}</Text>
        </View>
      );
    }

    // Days in current month
    const currentDate = parseDate(value);
    const isCurrentMonth =
      value &&
      currentDate.getFullYear() === year &&
      currentDate.getMonth() === month;

    const today = new Date();
    const isTodayMonth = today.getFullYear() === year && today.getMonth() === month;

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const isSelected = isCurrentMonth && currentDate.getDate() === day;
      const isToday = isTodayMonth && today.getDate() === day;

      cells.push(
        <TouchableOpacity
          key={`curr-${day}`}
          activeOpacity={0.7}
          onPress={() => handleWebDaySelect(day)}
          style={[
            styles.calCell,
            isSelected && styles.calCellSelected,
            isToday && !isSelected && styles.calCellToday,
          ]}
        >
          <Text
            style={[
              styles.calCellText,
              isSelected && styles.calCellTextSelected,
              isToday && !isSelected && styles.calCellTextToday,
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    // Next month padding to complete row
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      cells.push(
        <View key={`next-${i}`} style={styles.calCell}>
          <Text style={styles.calCellTextMuted}>{i}</Text>
        </View>
      );
    }

    return cells;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {required && <Text style={styles.required}> *</Text>}
        </View>
      )}

      <TouchableOpacity
        activeOpacity={disabled ? 1 : 0.7}
        onPress={handleOpenPicker}
        disabled={disabled}
        style={[
          styles.inputContainer,
          Boolean(error) && styles.inputError,
          disabled && styles.inputDisabled,
          style,
        ]}
      >
        <View style={styles.leftIconContainer}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        </View>

        <View style={styles.dateTextContainer}>
          {value ? (
            <Text style={styles.dateTextMain}>{displayDateStr}</Text>
          ) : (
            <Text style={styles.placeholderText}>{placeholder}</Text>
          )}
        </View>

        <View style={styles.rightIconContainer}>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </View>
      </TouchableOpacity>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}

      {/* iOS Modal with native DateTimePicker */}
      {Platform.OS === 'ios' && showPicker && (
        <Modal
          transparent
          animationType="fade"
          visible={showPicker}
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setShowPicker(false)}
            />
            <View style={styles.iosPickerCard}>
              <View style={styles.iosPickerHeader}>
                <TouchableOpacity
                  onPress={() => setShowPicker(false)}
                  style={styles.iosPickerHeaderBtn}
                >
                  <Text style={styles.iosPickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.iosPickerTitle}>{label || 'Select Date'}</Text>
                <TouchableOpacity
                  onPress={handleIosDone}
                  style={styles.iosPickerHeaderBtn}
                >
                  <Text style={styles.iosPickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>

              {RNDateTimePicker ? (
                <RNDateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={handleNativeChange}
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  textColor={colors.textPrimary}
                />
              ) : null}
            </View>
          </View>
        </Modal>
      )}

      {/* Android Fallback Modal when DateTimePickerAndroid.open is not used */}
      {Platform.OS === 'android' && showPicker && RNDateTimePicker && (
        <RNDateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleNativeChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}

      {/* Web & Universal Fallback Calendar Modal */}
      {(Platform.OS === 'web' || (!RNDateTimePicker && showPicker)) && showPicker && (
        <Modal
          transparent
          animationType="fade"
          visible={showPicker}
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setShowPicker(false)}
            />
            <View style={styles.calendarModalCard}>
              {/* Header */}
              <View style={styles.calHeader}>
                <TouchableOpacity
                  onPress={() => changeMonth(-1)}
                  style={styles.calNavBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
                </TouchableOpacity>

                <View style={styles.calHeaderTitleArea}>
                  <Text style={styles.calMonthYearText}>
                    {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => changeMonth(1)}
                  style={styles.calNavBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Day names */}
              <View style={styles.calDaysRow}>
                {DAY_NAMES.map((d, idx) => (
                  <View key={idx} style={styles.calDayHeaderCell}>
                    <Text style={styles.calDayHeaderText}>{d}</Text>
                  </View>
                ))}
              </View>

              {/* Grid */}
              <View style={styles.calGrid}>{renderCalendarDays()}</View>

              {/* Footer actions */}
              <View style={styles.calFooter}>
                <TouchableOpacity
                  onPress={() => {
                    const today = new Date();
                    onChange(formatDate(today));
                    setShowPicker(false);
                  }}
                  style={styles.calTodayBtn}
                >
                  <Text style={styles.calTodayBtnText}>Today</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowPicker(false)}
                  style={styles.calCloseBtn}
                >
                  <Text style={styles.calCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  required: {
    color: colors.danger,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: layout.inputHeight,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  inputError: {
    borderColor: colors.danger,
    borderWidth: 1.5,
  },
  inputDisabled: {
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.border,
  },
  leftIconContainer: {
    marginRight: spacing.sm,
  },
  rightIconContainer: {
    marginLeft: spacing.sm,
  },
  dateTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  dateTextMain: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 14,
  },
  placeholderText: {
    ...typography.body,
    color: colors.textMuted,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.xxs,
  },
  helperText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },

  // iOS Card
  iosPickerCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingBottom: spacing.lg,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iosPickerHeaderBtn: {
    padding: spacing.xs,
  },
  iosPickerTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  iosPickerCancelText: {
    ...typography.body,
    color: colors.textMuted,
  },
  iosPickerDoneText: {
    ...typography.bodyBold,
    color: colors.primary,
  },

  // Web & Universal Calendar Modal
  calendarModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  calHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  calNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calHeaderTitleArea: {
    alignItems: 'center',
  },
  calMonthYearText: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  calDaysRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  calDayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  calDayHeaderText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 12,
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCell: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 19,
  },
  calCellSelected: {
    backgroundColor: colors.primary,
  },
  calCellToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  calCellText: {
    ...typography.body,
    fontSize: 13,
    color: colors.textPrimary,
  },
  calCellTextSelected: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  calCellTextToday: {
    color: colors.primary,
    fontWeight: '700',
  },
  calCellTextMuted: {
    ...typography.body,
    fontSize: 13,
    color: colors.borderDark,
  },
  calFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  calTodayBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  calTodayBtnText: {
    ...typography.bodyBold,
    color: colors.primary,
    fontSize: 13,
  },
  calCloseBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  calCloseBtnText: {
    ...typography.body,
    color: colors.textMuted,
    fontSize: 13,
  },
});
