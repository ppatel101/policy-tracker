import { DEFAULT_CURRENCY } from './constants';

/**
 * Format a number using Indian numbering system (e.g., 1,00,000)
 * @param {number|string} value
 * @returns {string}
 */
export function formatIndianNumber(value) {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '0';
  }

  const num = Math.round(Number(value));
  const isNegative = num < 0;
  const absStr = Math.abs(num).toString();

  if (absStr.length <= 3) {
    return (isNegative ? '-' : '') + absStr;
  }

  const lastThree = absStr.substring(absStr.length - 3);
  const remaining = absStr.substring(0, absStr.length - 3);

  // Group remainder in 2s
  const groupedRemaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');

  return (isNegative ? '-' : '') + groupedRemaining + ',' + lastThree;
}

/**
 * Format amount as currency string with currency symbol
 * @param {number|string} amount
 * @param {string} currency - default 'INR'
 * @param {object} options - { showSymbol: true, decimalPlaces: 0 }
 * @returns {string}
 */
export function formatCurrency(amount, currency = DEFAULT_CURRENCY, options = {}) {
  const { showSymbol = true } = options;
  const formatted = formatIndianNumber(amount);

  if (!showSymbol) {
    return formatted;
  }

  const symbol = currency === 'INR' ? '₹' : (currency === 'USD' ? '$' : currency + ' ');
  return `${symbol}${formatted}`;
}

/**
 * Parse a numeric string (removes commas, currency symbols)
 * @param {string|number} value
 * @returns {number}
 */
export function parseCurrencyInput(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const cleaned = value.toString().replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
