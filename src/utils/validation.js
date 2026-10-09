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

  const premiumDigits = String(values.premiumAmount ?? '').replace(/[^0-9]/g, '');
  const premium = parseFloat(values.premiumAmount);
  if (isNaN(premium) || premium <= 0) {
    errors.premiumAmount = 'Premium amount must be greater than 0';
  } else if (premiumDigits.length > 8 || premium > 99999999) {
    errors.premiumAmount = 'Premium amount cannot exceed 8 digits';
  }

  if (!values.startDate || !values.startDate.trim()) {
    errors.startDate = 'Start date is required';
  } else {
    const d = new Date(values.startDate);
    if (isNaN(d.getTime())) {
      errors.startDate = 'Please enter a valid start date (YYYY-MM-DD)';
    }
  }

  const ppt = parseInt(values.premiumPayingTerm !== undefined ? values.premiumPayingTerm : values.durationYears, 10);
  if (isNaN(ppt) || ppt <= 0) {
    errors.premiumPayingTerm = 'Premium paying term must be at least 1 year';
    errors.durationYears = errors.premiumPayingTerm;
  } else if (ppt > 99) {
    errors.premiumPayingTerm = 'Premium paying term cannot exceed 99 years';
    errors.durationYears = errors.premiumPayingTerm;
  }

  if (values.policyTermYears !== undefined && values.policyTermYears !== null && values.policyTermYears !== '') {
    const pt = parseInt(values.policyTermYears, 10);
    if (isNaN(pt) || pt <= 0) {
      errors.policyTermYears = 'Policy term must be at least 1 year';
    } else if (pt > 99) {
      errors.policyTermYears = 'Policy term cannot exceed 99 years';
    } else if (!isNaN(ppt) && pt < ppt) {
      errors.policyTermYears = 'Policy term cannot be less than premium paying term';
    }
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
    const sumAssuredDigits = String(values.sumAssured).replace(/[^0-9]/g, '');
    const sumAssuredNum =
      typeof values.sumAssured === 'number'
        ? values.sumAssured
        : parseFloat(String(values.sumAssured).replace(/,/g, ''));
    if (isNaN(sumAssuredNum) || sumAssuredNum < 0) {
      errors.sumAssured = 'Sum assured must be a valid positive amount';
    } else if (sumAssuredDigits.length > 8 || sumAssuredNum > 99999999) {
      errors.sumAssured = 'Sum assured cannot exceed 8 digits';
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
