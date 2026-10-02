import { safeStorage } from '../storage/localStorage';
import { supabase, isSupabaseConfigured } from './supabase';
import { localStorage } from '../storage/localStorage';
import { mapPolicyToRow } from '../models/policy';
import { mapPaymentToRow } from '../models/payment';
import { generateUUID } from '../utils/uuid';
import { CURRENT_MIGRATION_VERSION, STORAGE_KEYS } from '../utils/constants';

const BACKUP_KEY = '@policy_tracker:migration_backup';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(str) {
  return typeof str === 'string' && UUID_REGEX.test(str);
}

export const migrationService = {
  /**
   * Check and migrate existing local policies/payments to Supabase for the authenticated user
   * @param {object} user - Authenticated Supabase user object
   * @returns {Promise<{ migrated: boolean, policiesCount: number, paymentsCount: number }>}
   */
  async migrateLocalDataToSupabase(user) {
    if (!user || !user.id || !isSupabaseConfigured()) {
      return { migrated: false, reason: 'No authenticated user or Supabase not configured' };
    }

    try {
      const currentVersion = await localStorage.getMigrationVersion();
      if (currentVersion >= CURRENT_MIGRATION_VERSION) {
        return { migrated: false, reason: 'Already migrated' };
      }

      // 1. Read existing local policies and payments
      const localPolicies = await localStorage.getCachedPolicies();
      const localPayments = await localStorage.getCachedPayments();

      if ((!localPolicies || localPolicies.length === 0) && (!localPayments || localPayments.length === 0)) {
        await localStorage.setMigrationVersion(CURRENT_MIGRATION_VERSION);
        return { migrated: false, reason: 'No local data to migrate' };
      }

      // 2. Keep local backup before any alteration
      await safeStorage.setItem(
        BACKUP_KEY,
        JSON.stringify({
          policies: localPolicies,
          payments: localPayments,
          backedUpAt: new Date().toISOString(),
        })
      );

      // 3. Validate & Map UUIDs
      const idMap = new Map(); // oldId -> newValidUuid

      const preparedPolicies = localPolicies.map((p) => {
        let validId = p.id;
        if (!isValidUUID(validId)) {
          validId = generateUUID();
          idMap.set(p.id, validId);
        }
        return {
          ...p,
          id: validId,
          userId: user.id,
        };
      });

      const preparedPayments = localPayments.map((pay) => {
        let validPayId = pay.id;
        if (!isValidUUID(validPayId)) {
          validPayId = generateUUID();
        }

        // Remap policyId if it changed
        const mappedPolicyId = idMap.get(pay.policyId) || pay.policyId;

        return {
          ...pay,
          id: validPayId,
          policyId: mappedPolicyId,
          userId: user.id,
        };
      });

      // 4. Insert policies into Supabase
      if (preparedPolicies.length > 0) {
        const policyRows = preparedPolicies.map(mapPolicyToRow);
        const { error: pError } = await supabase
          .from('policies')
          .upsert(policyRows, { onConflict: 'id' });

        if (pError) throw pError;
      }

      // 5. Insert payments into Supabase
      if (preparedPayments.length > 0) {
        const paymentRows = preparedPayments.map(mapPaymentToRow);
        const { error: payError } = await supabase
          .from('payments')
          .upsert(paymentRows, { onConflict: 'id' });

        if (payError) throw payError;
      }

      // 6. Update local cache with migrated records & set migration version
      await localStorage.setCachedPolicies(preparedPolicies);
      await localStorage.setCachedPayments(preparedPayments);
      await localStorage.setMigrationVersion(CURRENT_MIGRATION_VERSION);

      console.log(`[migrationService] Successfully migrated ${preparedPolicies.length} policies and ${preparedPayments.length} payments.`);

      return {
        migrated: true,
        policiesCount: preparedPolicies.length,
        paymentsCount: preparedPayments.length,
      };
    } catch (err) {
      console.error('[migrationService] Migration failed:', err);
      return { migrated: false, error: err.message };
    }
  },

  /**
   * Restore from backup in case of manual recovery
   */
  async restoreFromBackup() {
    try {
      const raw = await safeStorage.getItem(BACKUP_KEY);
      if (!raw) return null;
      const backup = JSON.parse(raw);
      await localStorage.setCachedPolicies(backup.policies || []);
      await localStorage.setCachedPayments(backup.payments || []);
      return backup;
    } catch (err) {
      console.error('[migrationService] Restore failed:', err);
      return null;
    }
  },
};
