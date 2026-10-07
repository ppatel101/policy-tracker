/**
 * Validate policy form input
 * @param {object} values
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validatePolicyForm(values) {
  const errors = {};

  if (!values.policyName || !values.policyName.trim()) {
    errors.policyName = 'Policy name is required';
  }

  if (!values.companyName || !values.companyName.trim()) {
    errors.companyName = 'Company name is required';
  }

  const premium = parseFloat(values.premiumAmount);
  if (isNaN(premium) || premium <= 0) {
    errors.premiumAmount = 'Premium amount must be greater than 0';
  }

  if (!values.startDate || !values.startDate.trim()) {
    errors.startDate = 'Start date is required';
  } else {
    const d = new Date(values.startDate);
    if (isNaN(d.getTime())) {
      errors.startDate = 'Please enter a valid start date (YYYY-MM-DD)';
    }
  }

  const duration = parseInt(values.durationYears, 10);
  if (isNaN(duration) || duration <= 0) {
    errors.durationYears = 'Duration must be at least 1 year';
  } else if (duration > 100) {
    errors.durationYears = 'Duration cannot exceed 100 years';
  }

  if (!values.nextDueDate || !values.nextDueDate.trim()) {
    errors.nextDueDate = 'Next due date is required';
  } else {
    const d = new Date(values.nextDueDate);
    if (isNaN(d.getTime())) {
      errors.nextDueDate = 'Please enter a valid due date (YYYY-MM-DD)';
    }
  }

  if (values.sumAssured !== undefined && values.sumAssured !== null && values.sumAssured !== '') {
    const sumAssuredNum =
      typeof values.sumAssured === 'number'
        ? values.sumAssured
        : parseFloat(String(values.sumAssured).replace(/,/g, ''));
    if (isNaN(sumAssuredNum) || sumAssuredNum < 0) {
      errors.sumAssured = 'Sum assured must be a valid positive amount';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate email address format
 * @param {string} email
 * @returns {string|null} error message or null if valid
 */
export function validateEmail(email) {
  if (!email || !email.trim()) {
    return 'Email is required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return 'Please enter a valid email address';
  }
  return null;
}

/**
 * Validate password
 * @param {string} password
 * @returns {string|null} error message or null if valid
 */
export function validatePassword(password) {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters';
  }
  return null;
}

/**
 * Validate phone number (optional or valid format)
 * @param {string} phone
 * @returns {string|null} error message or null
 */
export function validatePhone(phone) {
  if (!phone || !phone.trim()) return null;
  const digits = phone.replace(/[^0-9+]/g, '');
  if (digits.length < 10) {
    return 'Please enter a valid 10-digit phone number';
  }
  return null;
}
