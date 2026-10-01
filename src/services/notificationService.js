import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { formatCurrency } from '../utils/currencyUtils';
import { PAYMENT_STATUSES } from '../utils/constants';

// Configure notification behavior
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  // Gracefully handle in environments where notifications are stubbed
}

export const notificationService = {
  /**
   * Request permission for notifications
   */
  async requestPermissions() {
    if (Platform.OS === 'web') return false;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[notificationService] Notification permission not granted');
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('policy-reminders', {
          name: 'Policy Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2563EB',
        });
      }

      return true;
    } catch (err) {
      console.warn('[notificationService] requestPermissions error:', err);
      return false;
    }
  },

  /**
   * Schedule reminders for an upcoming payment
   * @param {object} payment
   * @param {object} policy
   * @param {object} settings
   */
  async schedulePaymentReminder(payment, policy, settings = {}) {
    if (Platform.OS === 'web') return;
    if (!payment || payment.status === PAYMENT_STATUSES.PAID) return;
    if (policy && policy.reminderEnabled === false) return;

    try {
      const dueDate = new Date(payment.dueDate);
      if (isNaN(dueDate.getTime())) return;

      const now = new Date();
      const policyName = policy ? policy.policyName : (payment.policyName || 'Insurance Policy');
      const amountStr = formatCurrency(payment.amount);

      // Cancel any existing notifications for this payment first
      await this.cancelPaymentReminder(payment.id);

      const daysBeforeList = [];
      if (settings.reminderDaysBefore) daysBeforeList.push(settings.reminderDaysBefore);
      if (settings.reminderDayBefore !== false) daysBeforeList.push(1);
      if (settings.reminderOnDueDate !== false) daysBeforeList.push(0);

      // Schedule for each interval
      for (const daysBefore of daysBeforeList) {
        const triggerDate = new Date(dueDate);
        triggerDate.setDate(triggerDate.getDate() - daysBefore);
        triggerDate.setHours(9, 0, 0, 0); // 9:00 AM on reminder day

        if (triggerDate.getTime() > now.getTime()) {
          const daysText = daysBefore === 0 ? 'today' : daysBefore === 1 ? 'tomorrow' : `in ${daysBefore} days`;
          const body = `Your ${policyName} premium of ${amountStr} is due ${daysText}.`;

          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Premium Payment Reminder',
              body,
              data: { paymentId: payment.id, policyId: payment.policyId },
              channelId: 'policy-reminders',
            },
            trigger: triggerDate,
            identifier: `payment_${payment.id}_${daysBefore}`,
          });
        }
      }
    } catch (err) {
      console.warn('[notificationService] Error scheduling notification:', err);
    }
  },

  /**
   * Cancel all notifications for a specific payment
   */
  async cancelPaymentReminder(paymentId) {
    if (Platform.OS === 'web' || !paymentId) return;
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notif of scheduled) {
        if (notif.identifier && notif.identifier.startsWith(`payment_${paymentId}`)) {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
      }
    } catch (err) {
      console.warn('[notificationService] Error canceling notification:', err);
    }
  },

  /**
   * Cancel all reminders
   */
  async cancelAllReminders() {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (err) {
      console.warn('[notificationService] Error canceling all notifications:', err);
    }
  },

  /**
   * Schedule reminders for all active upcoming payments
   */
  async scheduleAllReminders(payments = [], policies = [], settings = {}) {
    const policyMap = new Map(policies.map((p) => [p.id, p]));
    for (const payment of payments) {
      if (payment.status !== PAYMENT_STATUSES.PAID) {
        const policy = policyMap.get(payment.policyId);
        await this.schedulePaymentReminder(payment, policy, settings);
      }
    }
  },
};
