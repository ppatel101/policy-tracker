import { describe, it, expect } from 'bun:test';

import {
  formatIndianNumber,
  formatCurrency,
  parseCurrencyInput,
  formatSumAssured,
  formatSumAssuredParts,
} from '../src/utils/currencyUtils';

import {
  formatDate,
  formatDisplayDate,
  calculateEndDate,
  calculateRemainingDuration,
  isOverdue,
  isDueToday,
  isDueSoon,
  isUpcoming,
  getDueStatus,
  generatePaymentSchedule,
  calculateNextDueDateFromPayments,
  getFinancialYear,
  isDateInFinancialYear,
  filterPaymentsByFinancialYear,
  isCurrentYearPremium,
} from '../src/utils/dateUtils';

import {
  validatePolicyForm,
  validateEmail,
  validatePassword,
  validatePhone,
} from '../src/utils/validation';

import { createPolicyModel, mapRowToPolicy, mapPolicyToRow } from '../src/models/policy';
import { mapRowToPayment, mapPaymentToRow } from '../src/models/payment';
import { PAYMENT_STATUSES, POLICY_STATUSES } from '../src/utils/constants';

describe('Currency Utilities (Indian Number Formatting)', () => {
  it('formats numbers with Indian grouping commas', () => {
    expect(formatIndianNumber(25000)).toBe('25,000');
    expect(formatIndianNumber(120000)).toBe('1,20,000');
    expect(formatIndianNumber(10000000)).toBe('1,00,00,000');
    expect(formatIndianNumber(500)).toBe('500');
    expect(formatIndianNumber(0)).toBe('0');
  });

  it('formats currency with ₹ symbol by default', () => {
    expect(formatCurrency(25000)).toBe('₹25,000');
    expect(formatCurrency(120000)).toBe('₹1,20,000');
    expect(formatCurrency(0)).toBe('₹0');
  });

  it('handles negative currency amounts', () => {
    expect(formatCurrency(-5000)).toBe('₹-5,000');
  });

  it('parses currency input correctly', () => {
    expect(parseCurrencyInput('₹25,000')).toBe(25000);
    expect(parseCurrencyInput('1,20,000')).toBe(120000);
    expect(parseCurrencyInput('')).toBe(0);
  });

  it('formats sum assured into compact Indian units (Lakhs, Crores)', () => {
    expect(formatSumAssured(1000000)).toBe('₹10 Lakhs');
    expect(formatSumAssured(100000)).toBe('₹1 Lakh');
    expect(formatSumAssured(1250000)).toBe('₹12.5 Lakhs');
    expect(formatSumAssured(10000000)).toBe('₹1 Crore');
    expect(formatSumAssured(15000000)).toBe('₹1.5 Crores');
    expect(formatSumAssured(50000)).toBe('₹50,000');
  });

  it('breaks down sum assured into value and unit parts', () => {
    const parts10L = formatSumAssuredParts(1000000);
    expect(parts10L.symbol).toBe('₹');
    expect(parts10L.value).toBe('10');
    expect(parts10L.unit).toBe('Lakhs');
    expect(parts10L.fullText).toBe('₹10 Lakhs');

    const parts = formatSumAssuredParts(1250000);
    expect(parts.symbol).toBe('₹');
    expect(parts.value).toBe('12.5');
    expect(parts.unit).toBe('Lakhs');

    const parts1Cr = formatSumAssuredParts(10000000);
    expect(parts1Cr.symbol).toBe('₹');
    expect(parts1Cr.value).toBe('1');
    expect(parts1Cr.unit).toBe('Crore');

    const partsZero = formatSumAssuredParts(0);
    expect(partsZero.symbol).toBe('₹');
    expect(partsZero.value).toBe('0');
    expect(partsZero.unit).toBe('');
    expect(partsZero.fullText).toBe('₹0');
  });
});

describe('Date Utilities & Calculations', () => {
  it('formats dates consistently', () => {
    expect(formatDate(new Date(2026, 9, 1))).toBe('2026-10-01');
    expect(formatDisplayDate('2026-10-01')).toBe('01 Oct 2026');
  });

  it('calculates policy end date based on duration in years', () => {
    expect(calculateEndDate('2026-10-01', 5)).toBe('2031-10-01');
    expect(calculateEndDate('2026-01-15', 1)).toBe('2027-01-15');
  });

  it('calculates dynamic remaining duration accurately', () => {
    const today = new Date('2026-10-01');

    // Past date => expired
    expect(calculateRemainingDuration('2025-05-01', today)).toBe('Policy expired');

    // Exactly 5 years
    expect(calculateRemainingDuration('2031-10-01', today)).toBe('5 years remaining');

    // 3 years and 4 months
    expect(calculateRemainingDuration('2030-02-01', today)).toBe('3 years 4 months remaining');

    // 8 months
    expect(calculateRemainingDuration('2027-06-01', today)).toBe('8 months remaining');
  });

  it('identifies overdue, due today, due soon and upcoming statuses', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 2);

    const in3Days = new Date(today);
    in3Days.setDate(today.getDate() + 3);

    const in20Days = new Date(today);
    in20Days.setDate(today.getDate() + 20);

    expect(isOverdue(formatDate(yesterday), 'upcoming')).toBe(true);
    expect(isDueToday(formatDate(today), 'upcoming')).toBe(true);
    expect(isDueSoon(formatDate(in3Days), 'upcoming')).toBe(true);
    expect(isUpcoming(formatDate(in20Days), 'upcoming')).toBe(true);

    // Paid status should never be overdue
    expect(isOverdue(formatDate(yesterday), PAYMENT_STATUSES.PAID)).toBe(false);
    expect(getDueStatus(formatDate(yesterday), PAYMENT_STATUSES.PAID)).toBe(PAYMENT_STATUSES.PAID);
  });

  it('generates accurate payment schedules without duplicates or exceeding end date', () => {
    const yearlyPolicy = {
      startDate: '2026-10-01',
      endDate: '2031-10-01',
      durationYears: 5,
      paymentFrequency: 'yearly',
      premiumAmount: 20000,
    };

    const yearlySchedule = generatePaymentSchedule(yearlyPolicy);
    expect(yearlySchedule.length).toBe(5);
    expect(yearlySchedule[0].dueDate).toBe('2026-10-01');
    expect(yearlySchedule[1].dueDate).toBe('2027-10-01');
    expect(yearlySchedule[4].dueDate).toBe('2030-10-01');

    // Quarterly Policy: 2 years = 8 installments
    const quarterlyPolicy = {
      startDate: '2026-01-01',
      durationYears: 2,
      paymentFrequency: 'quarterly',
      premiumAmount: 5000,
    };

    const quarterlySchedule = generatePaymentSchedule(quarterlyPolicy);
    expect(quarterlySchedule.length).toBe(8);
    expect(quarterlySchedule[0].dueDate).toBe('2026-01-01');
    expect(quarterlySchedule[1].dueDate).toBe('2026-04-01');
  });

  it('calculates next due date as earliest unpaid payment', () => {
    const payments = [
      { id: '1', dueDate: '2026-01-01', status: PAYMENT_STATUSES.PAID },
      { id: '2', dueDate: '2026-02-01', status: PAYMENT_STATUSES.PAID },
      { id: '3', dueDate: '2026-03-01', status: PAYMENT_STATUSES.UPCOMING },
      { id: '4', dueDate: '2026-04-01', status: PAYMENT_STATUSES.UPCOMING },
    ];

    expect(calculateNextDueDateFromPayments(payments)).toBe('2026-03-01');

    // When all are paid
    const allPaid = payments.map((p) => ({ ...p, status: PAYMENT_STATUSES.PAID }));
    expect(calculateNextDueDateFromPayments(allPaid)).toBeNull();
  });

  it('determines the Indian Financial Year (1 Apr - 31 Mar) correctly', () => {
    // October 2026 => FY 2026-27 (1 Apr 2026 - 31 Mar 2027)
    const fyOct = getFinancialYear('2026-10-01');
    expect(fyOct.startYear).toBe(2026);
    expect(fyOct.endYear).toBe(2027);
    expect(fyOct.startDate).toBe('2026-04-01');
    expect(fyOct.endDate).toBe('2027-03-31');
    expect(fyOct.label).toBe('FY 2026-27');
    expect(fyOct.displayRange).toBe('1 Apr 2026 - 31 Mar 2027');

    // February 2027 => still FY 2026-27
    const fyFeb = getFinancialYear('2027-02-15');
    expect(fyFeb.startYear).toBe(2026);
    expect(fyFeb.endYear).toBe(2027);
    expect(fyFeb.startDate).toBe('2026-04-01');
    expect(fyFeb.endDate).toBe('2027-03-31');

    // March 31 2026 => FY 2025-26
    const fyMar = getFinancialYear('2026-03-31');
    expect(fyMar.startYear).toBe(2025);
    expect(fyMar.endYear).toBe(2026);
    expect(fyMar.startDate).toBe('2025-04-01');
    expect(fyMar.endDate).toBe('2026-03-31');

    // April 1 2026 => FY 2026-27
    const fyApr = getFinancialYear('2026-04-01');
    expect(fyApr.startYear).toBe(2026);
    expect(fyApr.endYear).toBe(2027);
  });

  it('checks if a date falls inside the Financial Year', () => {
    const fy2026_27 = getFinancialYear('2026-10-01');

    expect(isDateInFinancialYear('2026-04-01', fy2026_27)).toBe(true);
    expect(isDateInFinancialYear('2026-10-15', fy2026_27)).toBe(true);
    expect(isDateInFinancialYear('2027-03-31', fy2026_27)).toBe(true);

    // Day before FY start => false
    expect(isDateInFinancialYear('2026-03-31', fy2026_27)).toBe(false);
    // Day after FY end => false
    expect(isDateInFinancialYear('2027-04-01', fy2026_27)).toBe(false);
    // Different year => false
    expect(isDateInFinancialYear('2028-10-01', fy2026_27)).toBe(false);
  });

  it('filters payments strictly to the current Financial Year', () => {
    const fy = getFinancialYear('2026-10-01'); // 1 Apr 2026 - 31 Mar 2027

    const testPayments = [
      { id: '1', dueDate: '2026-03-15', amount: 10000 }, // previous FY
      { id: '2', dueDate: '2026-05-10', amount: 15000 }, // within FY
      { id: '3', dueDate: '2026-11-20', amount: 20000 }, // within FY
      { id: '4', dueDate: '2027-02-28', amount: 25000 }, // within FY
      { id: '5', dueDate: '2027-05-01', amount: 30000 }, // next FY
    ];

    const filtered = filterPaymentsByFinancialYear(testPayments, fy);
    expect(filtered.length).toBe(3);
    expect(filtered.map((p) => p.id)).toEqual(['2', '3', '4']);
  });

  it('determines if a payment is eligible to be marked as paid (current year premium only)', () => {
    const today = new Date('2026-10-07');

    // Due in current calendar year / current FY: eligible
    expect(isCurrentYearPremium('2026-10-28', today)).toBe(true);
    expect(isCurrentYearPremium('2026-12-15', today)).toBe(true);
    expect(isCurrentYearPremium('2027-02-10', today)).toBe(true); // Within current FY 2026-27

    // Overdue from past: eligible
    expect(isCurrentYearPremium('2026-05-10', today)).toBe(true);
    expect(isCurrentYearPremium('2025-10-28', today)).toBe(true);

    // Future years (next year FY 2027-28 and beyond): NOT eligible
    expect(isCurrentYearPremium('2027-10-28', today)).toBe(false);
    expect(isCurrentYearPremium('2028-10-28', today)).toBe(false);
    expect(isCurrentYearPremium('2035-10-28', today)).toBe(false);
  });
});

describe('Form Validations', () => {
  it('validates required policy fields correctly', () => {
    const invalidForm = {
      policyName: '',
      companyName: '',
      premiumAmount: 0,
      startDate: '',
      durationYears: 0,
      nextDueDate: '',
    };

    const result = validatePolicyForm(invalidForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.policyName).toBeDefined();
    expect(result.errors.companyName).toBeDefined();
    expect(result.errors.premiumAmount).toBeDefined();
    expect(result.errors.startDate).toBeDefined();
    expect(result.errors.durationYears).toBeDefined();

    const validForm = {
      policyName: 'HDFC Life Sanchay',
      companyName: 'HDFC Life',
      premiumAmount: 50000,
      startDate: '2026-10-01',
      durationYears: 10,
      nextDueDate: '2026-10-01',
    };

    const validResult = validatePolicyForm(validForm);
    expect(validResult.isValid).toBe(true);
    expect(Object.keys(validResult.errors).length).toBe(0);
  });

  it('validates email addresses', () => {
    expect(validateEmail('test@example.com')).toBeNull();
    expect(validateEmail('')).toBe('Email is required');
    expect(validateEmail('invalid-email')).toBe('Please enter a valid email address');
  });

  it('validates password strength', () => {
    expect(validatePassword('123456')).toBeNull();
    expect(validatePassword('123')).toBe('Password must be at least 6 characters');
    expect(validatePassword('')).toBe('Password is required');
  });

  it('validates phone numbers', () => {
    expect(validatePhone('+919876543210')).toBeNull();
    expect(validatePhone('123')).toBe('Please enter a valid 10-digit phone number');
    expect(validatePhone('')).toBeNull(); // optional
  });

  it('validates sumAssured field if provided', () => {
    const validWithSum = {
      policyName: 'HDFC Life Sanchay',
      companyName: 'HDFC Life',
      premiumAmount: 50000,
      startDate: '2026-10-01',
      durationYears: 10,
      nextDueDate: '2026-10-01',
      sumAssured: '10,00,000',
    };
    expect(validatePolicyForm(validWithSum).isValid).toBe(true);

    const invalidWithSum = {
      ...validWithSum,
      sumAssured: -500,
    };
    const invalidResult = validatePolicyForm(invalidWithSum);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errors.sumAssured).toBeDefined();
  });
});

describe('Model Mappings (camelCase <-> snake_case)', () => {
  it('maps Supabase policy row to camelCase JS model', () => {
    const dbRow = {
      id: 'pol-123',
      user_id: 'usr-456',
      policy_name: 'LIC Tech Term',
      company_name: 'LIC',
      policy_number: 'LIC1001',
      policy_type: 'Term Insurance',
      sum_assured: '1000000',
      premium_amount: '25000',
      payment_frequency: 'yearly',
      start_date: '2026-10-01',
      end_date: '2056-10-01',
      duration_years: 30,
      next_due_date: '2026-10-01',
      status: 'active',
      reminder_enabled: true,
      created_at: '2026-10-01T12:00:00Z',
      updated_at: '2026-10-01T12:00:00Z',
    };

    const policy = mapRowToPolicy(dbRow);
    expect(policy.id).toBe('pol-123');
    expect(policy.userId).toBe('usr-456');
    expect(policy.policyName).toBe('LIC Tech Term');
    expect(policy.companyName).toBe('LIC');
    expect(policy.sumAssured).toBe(1000000);
    expect(policy.premiumAmount).toBe(25000);
    expect(policy.paymentFrequency).toBe('yearly');
    expect(policy.durationYears).toBe(30);
  });

  it('maps camelCase JS model to Supabase row', () => {
    const policy = {
      id: 'pol-123',
      userId: 'usr-456',
      policyName: 'Star Health Optima',
      companyName: 'Star Health',
      policyNumber: 'STAR999',
      policyType: 'Health Insurance',
      sumAssured: 2500000,
      premiumAmount: 18000,
      paymentFrequency: 'yearly',
      startDate: '2026-10-01',
      endDate: '2027-10-01',
      durationYears: 1,
      nextDueDate: '2026-10-01',
      status: 'active',
      reminderEnabled: true,
    };

    const row = mapPolicyToRow(policy);
    expect(row.policy_name).toBe('Star Health Optima');
    expect(row.company_name).toBe('Star Health');
    expect(row.sum_assured).toBe(2500000);
    expect(row.premium_amount).toBe(18000);
    expect(row.user_id).toBe('usr-456');
  });

  it('correctly maps and parses sumAssured with comma strings and numbers in createPolicyModel', () => {
    const model = createPolicyModel({
      policyName: 'Max Life Smart',
      companyName: 'Max Life',
      sumAssured: '10,00,000',
      premiumAmount: '20,000',
    });
    expect(model.sumAssured).toBe(1000000);
    expect(model.premiumAmount).toBe(20000);

    const row = mapPolicyToRow(model);
    expect(row.sum_assured).toBe(1000000);
    const remapped = mapRowToPolicy(row);
    expect(remapped.sumAssured).toBe(1000000);
  });

  it('maps payment rows bidirectional', () => {
    const paymentRow = {
      id: 'pay-123',
      user_id: 'usr-456',
      policy_id: 'pol-123',
      installment_number: 2,
      due_date: '2027-10-01',
      paid_date: '2027-09-28',
      amount: '20000',
      paid_amount: '20000',
      status: 'paid',
      note: 'Installment 2',
    };

    const payment = mapRowToPayment(paymentRow);
    expect(payment.id).toBe('pay-123');
    expect(payment.installmentNumber).toBe(2);
    expect(payment.paidDate).toBe('2027-09-28');
    expect(payment.paidAmount).toBe(20000);

    const convertedRow = mapPaymentToRow(payment);
    expect(convertedRow.policy_id).toBe('pol-123');
    expect(convertedRow.installment_number).toBe(2);
    expect(convertedRow.paid_date).toBe('2027-09-28');
    expect(convertedRow.paid_amount).toBe(20000);
  });

  describe('Policy Details Premium Summary Calculations', () => {
    it('calculates total premium paid and total remaining correctly from installments', () => {
      const installments = [
        { id: '1', amount: 25000, status: PAYMENT_STATUSES.PAID },
        { id: '2', amount: 25000, status: PAYMENT_STATUSES.PAID },
        { id: '3', amount: 25000, status: PAYMENT_STATUSES.UPCOMING },
        { id: '4', amount: 25000, status: PAYMENT_STATUSES.UPCOMING },
      ];

      const paidPayments = installments.filter((p) => p.status === PAYMENT_STATUSES.PAID);
      const remainingPayments = installments.filter((p) => p.status !== PAYMENT_STATUSES.PAID);

      const totalPaid = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalRemaining = remainingPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      expect(totalPaid).toBe(50000);
      expect(totalRemaining).toBe(50000);
      expect(paidPayments.length).toBe(2);
      expect(remainingPayments.length).toBe(2);
      expect(formatCurrency(totalPaid)).toBe('₹50,000');
      expect(formatCurrency(totalRemaining)).toBe('₹50,000');
    });

    it('handles 100% completed premiums correctly', () => {
      const installments = [
        { id: '1', amount: 15000, status: PAYMENT_STATUSES.PAID },
        { id: '2', amount: 15000, status: PAYMENT_STATUSES.PAID },
      ];

      const totalPaid = installments
        .filter((p) => p.status === PAYMENT_STATUSES.PAID)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const totalRemaining = installments
        .filter((p) => p.status !== PAYMENT_STATUSES.PAID)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      expect(totalPaid).toBe(30000);
      expect(totalRemaining).toBe(0);
      expect(formatCurrency(totalPaid)).toBe('₹30,000');
      expect(formatCurrency(totalRemaining)).toBe('₹0');
    });

    it('handles all unpaid premiums correctly', () => {
      const installments = [
        { id: '1', amount: 10000, status: PAYMENT_STATUSES.OVERDUE },
        { id: '2', amount: 10000, status: PAYMENT_STATUSES.UPCOMING },
        { id: '3', amount: 10000, status: PAYMENT_STATUSES.UPCOMING },
      ];

      const totalPaid = installments
        .filter((p) => p.status === PAYMENT_STATUSES.PAID)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const totalRemaining = installments
        .filter((p) => p.status !== PAYMENT_STATUSES.PAID)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      expect(totalPaid).toBe(0);
      expect(totalRemaining).toBe(30000);
      expect(formatCurrency(totalPaid)).toBe('₹0');
      expect(formatCurrency(totalRemaining)).toBe('₹30,000');
    });
  });
});

