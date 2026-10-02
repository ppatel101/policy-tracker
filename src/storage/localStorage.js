import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, CURRENT_MIGRATION_VERSION } from '../utils/constants';

// In-memory fallback map in case native storage fails or is unavailable
const memoryFallback = new Map();

/**
 * Universal safe storage adapter that wraps AsyncStorage with an in-memory fallback
 */
export const safeStorage = {
  async getItem(key) {
    try {
      const val = await AsyncStorage.getItem(key);
      if (val !== null && val !== undefined) return val;
      return memoryFallback.get(key) ?? null;
    } catch (err) {
      console.warn(`[safeStorage] AsyncStorage.getItem failed for ${key}, using memory:`, err?.message);
      return memoryFallback.get(key) ?? null;
    }
  },

  async setItem(key, value) {
    memoryFallback.set(key, value);
    try {
      await AsyncStorage.setItem(key, value);
    } catch (err) {
      console.warn(`[safeStorage] AsyncStorage.setItem failed for ${key}, saved to memory:`, err?.message);
    }
  },

  async removeItem(key) {
    memoryFallback.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch (err) {
      console.warn(`[safeStorage] AsyncStorage.removeItem failed for ${key}:`, err?.message);
    }
  },

  async multiRemove(keys = []) {
    keys.forEach((k) => memoryFallback.delete(k));
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (err) {
      console.warn('[safeStorage] AsyncStorage.multiRemove failed:', err?.message);
    }
  },
};

/**
 * Safe JSON getter
 */
async function getItemJSON(key, defaultValue = null) {
  try {
    const raw = await safeStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (err) {
    console.warn(`[localStorage] Error reading ${key}:`, err);
    return defaultValue;
  }
}

/**
 * Safe JSON setter
 */
async function setItemJSON(key, value) {
  try {
    await safeStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[localStorage] Error writing ${key}:`, err);
  }
}

export const localStorage = {
  // Policies cache
  async getCachedPolicies() {
    return getItemJSON(STORAGE_KEYS.POLICIES, []);
  },
  async setCachedPolicies(policies) {
    return setItemJSON(STORAGE_KEYS.POLICIES, policies || []);
  },

  // Payments cache
  async getCachedPayments() {
    return getItemJSON(STORAGE_KEYS.PAYMENTS, []);
  },
  async setCachedPayments(payments) {
    return setItemJSON(STORAGE_KEYS.PAYMENTS, payments || []);
  },

  // Profile cache
  async getCachedProfile() {
    return getItemJSON(STORAGE_KEYS.PROFILE, null);
  },
  async setCachedProfile(profile) {
    return setItemJSON(STORAGE_KEYS.PROFILE, profile);
  },

  // Last sync timestamp
  async getLastSyncTime() {
    return safeStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  },
  async setLastSyncTime(time = new Date().toISOString()) {
    return safeStorage.setItem(STORAGE_KEYS.LAST_SYNC, time);
  },

  // Pending sync operations queue (for offline support)
  async getPendingSyncOperations() {
    return getItemJSON(STORAGE_KEYS.PENDING_OPS, []);
  },
  async addPendingSyncOperation(operation) {
    const ops = await this.getPendingSyncOperations();
    const newOp = {
      id: operation.id || 'op_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      type: operation.type,
      entity: operation.entity,
      data: operation.data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };
    ops.push(newOp);
    await setItemJSON(STORAGE_KEYS.PENDING_OPS, ops);
    return newOp;
  },
  async removePendingSyncOperation(operationId) {
    const ops = await this.getPendingSyncOperations();
    const filtered = ops.filter((op) => op.id !== operationId);
    await setItemJSON(STORAGE_KEYS.PENDING_OPS, filtered);
  },
  async clearPendingSyncOperations() {
    await safeStorage.removeItem(STORAGE_KEYS.PENDING_OPS);
  },

  // Migration status
  async getMigrationVersion() {
    const raw = await safeStorage.getItem(STORAGE_KEYS.MIGRATION_VERSION);
    return raw ? parseInt(raw, 10) : 0;
  },
  async setMigrationVersion(version = CURRENT_MIGRATION_VERSION) {
    await safeStorage.setItem(STORAGE_KEYS.MIGRATION_VERSION, String(version));
  },

  // User Settings
  async getSettings() {
    return getItemJSON(STORAGE_KEYS.SETTINGS, {
      notificationsEnabled: true,
      reminderDaysBefore: 7,
      reminderOnDueDate: true,
      reminderDayBefore: true,
      currency: 'INR',
      theme: 'light',
    });
  },
  async setSettings(settings) {
    return setItemJSON(STORAGE_KEYS.SETTINGS, settings);
  },

  // Clear all user cache on logout
  async clearUserCache() {
    try {
      await safeStorage.multiRemove([
        STORAGE_KEYS.POLICIES,
        STORAGE_KEYS.PAYMENTS,
        STORAGE_KEYS.PROFILE,
        STORAGE_KEYS.LAST_SYNC,
        STORAGE_KEYS.PENDING_OPS,
      ]);
    } catch (err) {
      console.warn('[localStorage] Error clearing cache:', err);
    }
  },
};
