/**
 * Payment Data Model and Mappers
 * JavaScript uses camelCase, Supabase uses snake_case
 */

export function createPaymentModel(data = {}) {
  return {
    id: data.id || null,
    userId: data.userId || null,
    policyId: data.policyId || null,
    installmentNumber: parseInt(data.installmentNumber, 10) || 1,
    dueDate: data.dueDate || '',
    paidDate: data.paidDate || null,
    amount: Number(data.amount) || 0,
    paidAmount: data.paidAmount !== null && data.paidAmount !== undefined ? Number(data.paidAmount) : null,
    status: data.status || 'upcoming',
    note: data.note || null,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

/**
 * Maps Supabase row (snake_case) to application model (camelCase)
 * @param {object} row
 * @returns {object}
 */
export function mapRowToPayment(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    policyId: row.policy_id,
    installmentNumber: row.installment_number || 1,
    dueDate: row.due_date,
    paidDate: row.paid_date,
    amount: Number(row.amount) || 0,
    paidAmount: row.paid_amount !== null && row.paid_amount !== undefined ? Number(row.paid_amount) : null,
    status: row.status || 'upcoming',
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Optional joined policy data
    policyName: row.policies ? row.policies.policy_name : row.policy_name,
    companyName: row.policies ? row.policies.company_name : row.company_name,
  };
}

/**
 * Maps application model (camelCase) to Supabase row (snake_case)
 * @param {object} payment
 * @returns {object}
 */
export function mapPaymentToRow(payment) {
  if (!payment) return null;
  const row = {
    policy_id: payment.policyId,
    installment_number: parseInt(payment.installmentNumber, 10) || 1,
    due_date: payment.dueDate,
    paid_date: payment.paidDate || null,
    amount: Number(payment.amount),
    paid_amount: payment.paidAmount !== null && payment.paidAmount !== undefined ? Number(payment.paidAmount) : null,
    status: payment.status || 'upcoming',
    note: payment.note || null,
  };

  if (payment.id) row.id = payment.id;
  if (payment.userId) row.user_id = payment.userId;
  if (payment.createdAt) row.created_at = payment.createdAt;
  if (payment.updatedAt) row.updated_at = payment.updatedAt;

  return row;
}
