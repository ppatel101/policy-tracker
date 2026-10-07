import { parseCurrencyInput } from '../utils/currencyUtils';

/**
 * Policy Data Model and Mappers
 * JavaScript uses camelCase, Supabase uses snake_case
 */

export function createPolicyModel(data = {}) {
  let parsedSum = null;
  if (data.sumAssured !== undefined && data.sumAssured !== null && data.sumAssured !== '') {
    parsedSum = typeof data.sumAssured === 'number' ? data.sumAssured : parseCurrencyInput(data.sumAssured);
  } else if (data.idv !== undefined && data.idv !== null && data.idv !== '') {
    parsedSum = typeof data.idv === 'number' ? data.idv : parseCurrencyInput(data.idv);
  }

  let coveredMembers = [];
  if (Array.isArray(data.coveredMembers)) {
    coveredMembers = data.coveredMembers;
  } else if (typeof data.coveredMembers === 'string') {
    try {
      coveredMembers = JSON.parse(data.coveredMembers);
    } catch {
      coveredMembers = [];
    }
  }

  return {
    id: data.id || null,
    userId: data.userId || null,
    policyName: data.policyName || '',
    companyName: data.companyName || '',
    policyNumber: data.policyNumber || '',
    policyType: data.policyType || 'Life Insurance',
    sumAssured: parsedSum,
    idv: parsedSum,
    tpaName: data.tpaName || '',
    coveredMembers: Array.isArray(coveredMembers) ? coveredMembers : [],
    premiumAmount: typeof data.premiumAmount === 'number' ? data.premiumAmount : parseCurrencyInput(data.premiumAmount),
    paymentFrequency: data.paymentFrequency || 'yearly',
    startDate: data.startDate || '',
    endDate: data.endDate || null,
    durationYears: parseInt(data.durationYears, 10) || 1,
    nextDueDate: data.nextDueDate || '',
    status: data.status || 'active',
    reminderEnabled: data.reminderEnabled !== undefined ? Boolean(data.reminderEnabled) : true,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

/**
 * Maps Supabase row (snake_case) to application model (camelCase)
 * @param {object} row
 * @returns {object}
 */
export function mapRowToPolicy(row) {
  if (!row) return null;

  let coveredMembers = [];
  if (Array.isArray(row.covered_members)) {
    coveredMembers = row.covered_members;
  } else if (typeof row.covered_members === 'string') {
    try {
      coveredMembers = JSON.parse(row.covered_members);
    } catch {
      coveredMembers = [];
    }
  }

  const parsedSum = row.sum_assured !== undefined && row.sum_assured !== null
    ? Number(row.sum_assured)
    : null;

  return {
    id: row.id,
    userId: row.user_id,
    policyName: row.policy_name,
    companyName: row.company_name,
    policyNumber: row.policy_number,
    policyType: row.policy_type || 'Life Insurance',
    sumAssured: parsedSum,
    idv: parsedSum,
    tpaName: row.tpa_name || '',
    coveredMembers: Array.isArray(coveredMembers) ? coveredMembers : [],
    premiumAmount: Number(row.premium_amount) || 0,
    paymentFrequency: row.payment_frequency || 'yearly',
    startDate: row.start_date,
    endDate: row.end_date,
    durationYears: row.duration_years || 1,
    nextDueDate: row.next_due_date,
    status: row.status || 'active',
    reminderEnabled: row.reminder_enabled !== undefined ? Boolean(row.reminder_enabled) : true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps application model (camelCase) to Supabase row (snake_case)
 * @param {object} policy
 * @returns {object}
 */
export function mapPolicyToRow(policy) {
  if (!policy) return null;
  let parsedSum = null;
  if (policy.sumAssured !== undefined && policy.sumAssured !== null && policy.sumAssured !== '') {
    parsedSum = typeof policy.sumAssured === 'number' ? policy.sumAssured : parseCurrencyInput(policy.sumAssured);
  } else if (policy.idv !== undefined && policy.idv !== null && policy.idv !== '') {
    parsedSum = typeof policy.idv === 'number' ? policy.idv : parseCurrencyInput(policy.idv);
  }

  const row = {
    policy_name: policy.policyName,
    company_name: policy.companyName,
    policy_number: policy.policyNumber || null,
    policy_type: policy.policyType || 'Life Insurance',
    sum_assured: parsedSum,
    premium_amount: typeof policy.premiumAmount === 'number' ? policy.premiumAmount : parseCurrencyInput(policy.premiumAmount),
    payment_frequency: policy.paymentFrequency || 'yearly',
    start_date: policy.startDate,
    end_date: policy.endDate || null,
    duration_years: parseInt(policy.durationYears, 10) || 1,
    next_due_date: policy.nextDueDate,
    status: policy.status || 'active',
    reminder_enabled: policy.reminderEnabled !== undefined ? Boolean(policy.reminderEnabled) : true,
  };

  if (policy.tpaName && policy.tpaName.trim()) {
    row.tpa_name = policy.tpaName.trim();
  }

  if (Array.isArray(policy.coveredMembers) && policy.coveredMembers.length > 0) {
    row.covered_members = JSON.stringify(policy.coveredMembers);
  }

  if (policy.id) row.id = policy.id;
  if (policy.userId) row.user_id = policy.userId;
  if (policy.createdAt) row.created_at = policy.createdAt;
  if (policy.updatedAt) row.updated_at = policy.updatedAt;

  return row;
}
