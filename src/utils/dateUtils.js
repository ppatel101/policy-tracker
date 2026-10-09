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
 * Calculate policy end date given start date and policy term in years
 * End date is calculated based on policy term (e.g. 2020-10-08 with 10 years policy term -> 2030-10-08)
 * @param {Date|string} startDate
 * @param {number} policyTermYears
 * @returns {string} YYYY-MM-DD
 */
export function calculateEndDate(startDate, policyTermYears = 1) {
  if (!startDate) return '';
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return '';
  const years = parseInt(policyTermYears, 10) || 1;
  d.setFullYear(d.getFullYear() + years);
  return formatDate(d);
}

/**
 * Calculate next due date from start date and payment frequency
 * (e.g. for yearly: 1 year after start date, e.g. 2020-10-08 -> 2021-10-08; half-yearly: 6 months after start date)
 * @param {Date|string} startDate
 * @param {string} frequency - 'yearly' | 'half-yearly' | 'quarterly' | 'monthly'
 * @returns {string} YYYY-MM-DD
 */
export function calculateNextDueDate(startDate, frequency = 'yearly') {
  if (!startDate) return '';
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return '';

  const startDay = d.getDate();
  let intervalMonths = 12;
  switch ((frequency || '').toLowerCase()) {
    case 'monthly':
      intervalMonths = 1;
      break;
    case 'quarterly':
      intervalMonths = 3;
      break;
    case 'half-yearly':
      intervalMonths = 6;
      break;
    case 'yearly':
    default:
      intervalMonths = 12;
      break;
  }

  d.setMonth(d.getMonth() + intervalMonths);
  if (d.getDate() !== startDay) {
    d.setDate(0); // adjust for end-of-month overflow (e.g. 31 Jan -> 28 Feb)
  }
  return formatDate(d);
}

/**
 * Generate schedule of future payments for a policy
 * Installment count is based on Premium Paying Term (PPT)
 * @param {object} policy
 * @param {string} policy.startDate
 * @param {string} [policy.endDate]
 * @param {number} [policy.durationYears] - Premium paying term (years)
 * @param {number} [policy.premiumPayingTerm] - Premium paying term (years)
 * @param {number} [policy.policyTermYears] - Policy term (years)
 * @param {string} policy.paymentFrequency - 'monthly'|'quarterly'|'half-yearly'|'yearly'
 * @param {number} policy.premiumAmount
 * @param {string} [policy.id]
 * @param {string} [policy.userId]
 * @param {Date|string} [referenceDate]
 * @returns {Array<object>}
 */
export function generatePaymentSchedule(policy, referenceDate = new Date()) {
  const {
    startDate,
    endDate: explicitEndDate,
    durationYears = 1,
    premiumPayingTerm,
    policyTermYears,
    paymentFrequency = 'yearly',
    premiumAmount = 0,
    id: policyId,
    userId,
  } = policy;

  if (!startDate) return [];

  const start = new Date(startDate);
  if (isNaN(start.getTime())) return [];

  const ppt = parseInt(premiumPayingTerm || durationYears, 10) || 1;
  const policyTerm = parseInt(policyTermYears || policy.policyTerm || durationYears, 10) || ppt;
  const calculatedEndDate = explicitEndDate
    ? new Date(explicitEndDate)
    : new Date(new Date(startDate).setFullYear(start.getFullYear() + policyTerm));

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

  const totalInstallments = ppt * perYear;
  const schedule = [];
  const startDay = start.getDate();
  const refDate = referenceDate ? new Date(referenceDate) : new Date();

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
    if (startOfDay(installmentDate).getTime() > startOfDay(calculatedEndDate).getTime()) {
      break;
    }

    const formattedDueDate = formatDate(installmentDate);
    const isPast = startOfDay(installmentDate).getTime() < startOfDay(refDate).getTime();

    schedule.push({
      policyId: policyId || null,
      userId: userId || null,
      installmentNumber: i + 1,
      dueDate: formattedDueDate,
      paidDate: isPast ? formattedDueDate : null,
      amount: Number(premiumAmount),
      paidAmount: isPast ? Number(premiumAmount) : null,
      status: isPast ? PAYMENT_STATUSES.PAID : PAYMENT_STATUSES.UPCOMING,
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

/**
 * Get current Indian Financial Year details (1 April to 31 March)
 * @param {Date|string} referenceDate
 * @returns {{ startYear: number, endYear: number, startDate: string, endDate: string, label: string, displayRange: string }}
 */
export function getFinancialYear(referenceDate = new Date()) {
  const d = new Date(referenceDate);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-indexed: 0 = Jan, 3 = Apr

  let startYear;
  let endYear;

  if (month >= 3) {
    // April or later
    startYear = year;
    endYear = year + 1;
  } else {
    // January to March
    startYear = year - 1;
    endYear = year;
  }

  const startDate = `${startYear}-04-01`;
  const endDate = `${endYear}-03-31`;
  const shortEndYear = String(endYear).slice(-2);

  return {
    startYear,
    endYear,
    startDate,
    endDate,
    label: `FY ${startYear}-${shortEndYear}`,
    displayRange: `1 Apr ${startYear} - 31 Mar ${endYear}`,
  };
}

/**
 * Check if a date falls within a given Financial Year
 * @param {Date|string} date
 * @param {object} [fy]
 * @returns {boolean}
 */
export function isDateInFinancialYear(date, fy = getFinancialYear()) {
  if (!date) return false;
  const formatted = typeof date === 'string' && date.length === 10 ? date : formatDate(date);
  return formatted >= fy.startDate && formatted <= fy.endDate;
}

/**
 * Filter payments that fall within the current or specified Financial Year
 * @param {Array<object>} payments
 * @param {object} [fy]
 * @returns {Array<object>}
 */
export function filterPaymentsByFinancialYear(payments = [], fy = getFinancialYear()) {
  if (!Array.isArray(payments)) return [];
  return payments.filter((p) => p && isDateInFinancialYear(p.dueDate, fy));
}

/**
 * Check if a payment due date belongs to the current year premium period
 * (due in current Indian Financial Year, current calendar year, or past/overdue).
 * Payments for future years (beyond current FY/year) cannot be marked as paid.
 * @param {string|Date} dueDate
 * @param {Date} [referenceDate]
 * @returns {boolean}
 */
export function isCurrentYearPremium(dueDate, referenceDate = new Date()) {
  if (!dueDate) return false;
  const d = new Date(dueDate);
  if (isNaN(d.getTime())) return false;

  const today = new Date(referenceDate);
  const formattedToday = formatDate(today);
  const formattedDue = typeof dueDate === 'string' && dueDate.length === 10 ? dueDate : formatDate(d);

  // Overdue payments or payments due today can always be marked as paid
  if (formattedDue <= formattedToday) {
    return true;
  }

  // Current Indian Financial Year (e.g. 1 Apr 2026 - 31 Mar 2027)
  const fy = getFinancialYear(today);
  if (formattedDue >= fy.startDate && formattedDue <= fy.endDate) {
    return true;
  }

  // Current Calendar Year (e.g. 2026)
  if (d.getFullYear() === today.getFullYear()) {
    return true;
  }

  return false;
}


