import { PAYMENT_STATUSES } from './constants';

/**
 * Format a Date or date string to YYYY-MM-DD
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date for user display: e.g. "15 Oct 2026"
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDisplayDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Normalize date to midnight UTC/local comparison
 * @param {Date|string} date
 * @returns {Date}
 */
export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Calculate difference in whole calendar days (date2 - date1)
 * @param {Date|string} date1
 * @param {Date|string} date2
 * @returns {number}
 */
export function getDaysDifference(date1, date2 = new Date()) {
  const d1 = startOfDay(date1);
  const d2 = startOfDay(date2);
  const diffTime = d1.getTime() - d2.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if payment is overdue
 * @param {Date|string} dueDate
 * @param {string} status
 * @returns {boolean}
 */
export function isOverdue(dueDate, status) {
  if (status === PAYMENT_STATUSES.PAID) return false;
  return getDaysDifference(dueDate, new Date()) < 0;
}

/**
 * Check if payment is due today
 * @param {Date|string} dueDate
 * @param {string} status
 * @returns {boolean}
 */
export function isDueToday(dueDate, status) {
  if (status === PAYMENT_STATUSES.PAID) return false;
  return getDaysDifference(dueDate, new Date()) === 0;
}

/**
 * Check if payment is due soon (within 7 days and >= today)
 * @param {Date|string} dueDate
 * @param {string} status
 * @returns {boolean}
 */
export function isDueSoon(dueDate, status) {
  if (status === PAYMENT_STATUSES.PAID) return false;
  const days = getDaysDifference(dueDate, new Date());
  return days > 0 && days <= 7;
}

/**
 * Check if payment is upcoming (more than 7 days away)
 * @param {Date|string} dueDate
 * @param {string} status
 * @returns {boolean}
 */
export function isUpcoming(dueDate, status) {
  if (status === PAYMENT_STATUSES.PAID) return false;
  const days = getDaysDifference(dueDate, new Date());
  return days > 7;
}

/**
 * Get unified payment due status
 * @param {Date|string} dueDate
 * @param {string} status
 * @returns {string} 'paid' | 'overdue' | 'due_today' | 'due_soon' | 'upcoming'
 */
export function getDueStatus(dueDate, status) {
  if (status === PAYMENT_STATUSES.PAID) {
    return PAYMENT_STATUSES.PAID;
  }
  const days = getDaysDifference(dueDate, new Date());
  if (days < 0) return PAYMENT_STATUSES.OVERDUE;
  if (days === 0) return PAYMENT_STATUSES.DUE_TODAY;
  if (days <= 7) return PAYMENT_STATUSES.DUE_SOON;
  return PAYMENT_STATUSES.UPCOMING;
}

/**
 * Get friendly text for payment due status
 * @param {Date|string} dueDate
 * @param {string} status
 * @returns {string}
 */
export function getDueText(dueDate, status) {
  if (status === PAYMENT_STATUSES.PAID) return 'Paid';
  const days = getDaysDifference(dueDate, new Date());
  if (days < 0) {
    const abs = Math.abs(days);
    return `Overdue by ${abs} day${abs === 1 ? '' : 's'}`;
  }
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

/**
 * Calculate dynamic remaining duration for a policy
 * Returns "3 years 4 months remaining", "8 months remaining", "12 days remaining", or "Policy expired"
 * @param {Date|string} endDate
 * @param {Date|string} referenceDate
 * @returns {string}
 */
export function calculateRemainingDuration(endDate, referenceDate = new Date()) {
  if (!endDate) return 'No end date';
  const end = startOfDay(endDate);
  const today = startOfDay(referenceDate);

  if (end.getTime() < today.getTime()) {
    return 'Policy expired';
  }

  let years = end.getFullYear() - today.getFullYear();
  let months = end.getMonth() - today.getMonth();
  let days = end.getDate() - today.getDate();

  if (days < 0) {
    months -= 1;
    // Get days in previous month
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts = [];
  if (years > 0) {
    parts.push(`${years} year${years === 1 ? '' : 's'}`);
  }
  if (months > 0) {
    parts.push(`${months} month${months === 1 ? '' : 's'}`);
  }

  if (parts.length > 0) {
    return `${parts.join(' ')} remaining`;
  }

  if (days > 0) {
    return `${days} day${days === 1 ? '' : 's'} remaining`;
  }

  return 'Expires today';
}

/**
 * Calculate policy end date given start date and duration in years
 * @param {Date|string} startDate
 * @param {number} durationYears
 * @returns {string} YYYY-MM-DD
 */
export function calculateEndDate(startDate, durationYears = 1) {
  if (!startDate) return '';
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return '';
  const years = parseInt(durationYears, 10) || 1;
  d.setFullYear(d.getFullYear() + years);
  return formatDate(d);
}

/**
 * Generate schedule of future payments for a policy
 * @param {object} policy
 * @param {string} policy.startDate
 * @param {string} [policy.endDate]
 * @param {number} policy.durationYears
 * @param {string} policy.paymentFrequency - 'monthly'|'quarterly'|'half-yearly'|'yearly'
 * @param {number} policy.premiumAmount
 * @param {string} [policy.id]
 * @param {string} [policy.userId]
 * @returns {Array<object>}
 */
export function generatePaymentSchedule(policy) {
  const {
    startDate,
    endDate: explicitEndDate,
    durationYears = 1,
    paymentFrequency = 'yearly',
    premiumAmount = 0,
    id: policyId,
    userId,
  } = policy;

  if (!startDate) return [];

  const start = new Date(startDate);
  if (isNaN(start.getTime())) return [];

  const years = parseInt(durationYears, 10) || 1;
  const calculatedEndDate = explicitEndDate
    ? new Date(explicitEndDate)
    : new Date(new Date(startDate).setFullYear(start.getFullYear() + years));

  let intervalMonths = 12;
  let perYear = 1;

  switch (paymentFrequency.toLowerCase()) {
    case 'monthly':
      intervalMonths = 1;
      perYear = 12;
      break;
    case 'quarterly':
      intervalMonths = 3;
      perYear = 4;
      break;
    case 'half-yearly':
      intervalMonths = 6;
      perYear = 2;
      break;
    case 'yearly':
    default:
      intervalMonths = 12;
      perYear = 1;
      break;
  }

  const totalInstallments = years * perYear;
  const schedule = [];
  const startDay = start.getDate();

  for (let i = 0; i < totalInstallments; i++) {
    const installmentDate = new Date(start);
    // Add months accurately
    installmentDate.setMonth(start.getMonth() + i * intervalMonths);

    // Adjust for month length overflow (e.g., Jan 31 -> Feb 28)
    const expectedMonth = (start.getMonth() + i * intervalMonths) % 12;
    if (installmentDate.getMonth() !== expectedMonth) {
      installmentDate.setDate(0); // set to last day of previous month
    } else {
      installmentDate.setDate(Math.min(startDay, installmentDate.getDate()));
    }

    // Do not generate payments strictly past policy end date
    if (installmentDate.getTime() > calculatedEndDate.getTime()) {
      break;
    }

    const formattedDueDate = formatDate(installmentDate);

    schedule.push({
      policyId: policyId || null,
      userId: userId || null,
      installmentNumber: i + 1,
      dueDate: formattedDueDate,
      paidDate: null,
      amount: Number(premiumAmount),
      paidAmount: null,
      status: PAYMENT_STATUSES.UPCOMING,
      note: `Installment ${i + 1} of ${totalInstallments}`,
    });
  }

  return schedule;
}

/**
 * Calculate next unpaid payment due date from payments list
 * @param {Array<object>} payments
 * @returns {string|null} YYYY-MM-DD or null
 */
export function calculateNextDueDateFromPayments(payments = []) {
  if (!Array.isArray(payments) || payments.length === 0) return null;

  const unpaid = payments
    .filter((p) => p && p.status !== PAYMENT_STATUSES.PAID)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  if (unpaid.length > 0) {
    return unpaid[0].dueDate;
  }
  return null;
}
