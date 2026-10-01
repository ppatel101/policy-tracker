export const POLICY_TYPES = [
  'Life Insurance',
  'Health Insurance',
  'Vehicle Insurance',
  'Term Insurance',
  'Home Insurance',
  'Travel Insurance',
  'Child Education Plan',
  'Pension / Retirement',
  'Other',
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
