export const POLICY_TYPES = [
  'Life Insurance',
  'Health Insurance',
  'Vehicle Insurance',
  'Term Insurance',
];

export const PAYMENT_FREQUENCIES = [
  { value: 'monthly', label: 'Monthly', months: 1, perYear: 12 },
  { value: 'quarterly', label: 'Quarterly', months: 3, perYear: 4 },
  { value: 'half-yearly', label: 'Half-Yearly', months: 6, perYear: 2 },
  { value: 'yearly', label: 'Yearly', months: 12, perYear: 1 },
];

export const POLICY_STATUSES = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  MATURED: 'matured',
};

export const PAYMENT_STATUSES = {
  UPCOMING: 'upcoming',
  DUE_SOON: 'due_soon',
  DUE_TODAY: 'due_today',
  OVERDUE: 'overdue',
  PAID: 'paid',
};

export const STORAGE_KEYS = {
  POLICIES: '@policy_tracker:policies',
  PAYMENTS: '@policy_tracker:payments',
  PROFILE: '@policy_tracker:profile',
  LAST_SYNC: '@policy_tracker:last_sync_time',
  PENDING_OPS: '@policy_tracker:pending_sync_operations',
  MIGRATION_VERSION: '@policy_tracker:migration_version',
  SETTINGS: '@policy_tracker:settings',
};

export const CURRENT_MIGRATION_VERSION = 1;

export const DEFAULT_CURRENCY = 'INR';

export const SORT_OPTIONS = [
  { id: 'next_due_date', label: 'Next Due Date' },
  { id: 'policy_name', label: 'Policy Name' },
  { id: 'company_name', label: 'Company' },
  { id: 'premium_amount', label: 'Premium Amount' },
  { id: 'recently_added', label: 'Recently Added' },
];

export const POLICY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'expired', label: 'Expired' },
  { id: 'cancelled', label: 'Cancelled' },
];

export const PAYMENT_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'due_soon', label: 'Due Soon' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'paid', label: 'Paid' },
];

export const FAMILY_RELATIONS = [
  'Self',
  'Spouse',
  'Son',
  'Daughter',
  'Father',
  'Mother',
  'Brother',
  'Sister',
  'Other',
];

/**
 * Checks whether a policy type is Health Insurance (Mediclaim)
 * @param {string} policyType
 * @returns {boolean}
 */
export const isHealthPolicy = (policyType) => {
  if (!policyType) return false;
  const lower = String(policyType).toLowerCase();
  return lower.includes('health') || lower.includes('mediclaim');
};

/**
 * Checks whether a policy type is Vehicle / Motor Insurance
 * @param {string} policyType
 * @returns {boolean}
 */
export const isVehiclePolicy = (policyType) => {
  if (!policyType) return false;
  const lower = String(policyType).toLowerCase();
  return lower.includes('vehicle') || lower.includes('motor') || lower.includes('car') || lower.includes('bike') || lower.includes('auto');
};

/**
 * Checks whether a policy type is an Annual Renewable Policy (1-year cycle: Health or Vehicle)
 * @param {string} policyType
 * @returns {boolean}
 */
export const isAnnualRenewablePolicy = (policyType) => {
  return isHealthPolicy(policyType) || isVehiclePolicy(policyType);
};

/**
 * Returns the contextual label for the coverage amount (Sum Assured / Health Coverage / Vehicle IDV)
 * @param {string} policyType
 * @returns {string}
 */
export const getCoverageLabel = (policyType) => {
  if (isVehiclePolicy(policyType)) {
    return 'IDV (Insured Declared Value)';
  }
  if (isHealthPolicy(policyType)) {
    return 'Coverage (Sum Insured)';
  }
  return 'Sum Assured';
};

/**
 * Returns a compact label for cards and badges (IDV / Coverage / Sum Assured)
 * @param {string} policyType
 * @returns {string}
 */
export const getCoverageShortLabel = (policyType) => {
  if (isVehiclePolicy(policyType)) {
    return 'IDV';
  }
  if (isHealthPolicy(policyType)) {
    return 'Coverage';
  }
  return 'Sum Assured';
};


