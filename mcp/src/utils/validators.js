import { ValidationError } from '../lib/errors.js';

/**
 * Validation helper functions
 */

/**
 * Validate required fields in an object
 * @param {Object} data - Data to validate
 * @param {string[]} requiredFields - Array of required field names
 * @param {string} context - Context name for error messages
 * @throws {ValidationError} If validation fails
 */
export function validateRequiredFields(data, requiredFields, context = 'Data') {
  const errors = [];
  
  if (!data) {
    throw new ValidationError(`${context} is required`);
  }

  requiredFields.forEach((field) => {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`Field '${field}' is required`);
    }
  });

  if (errors.length > 0) {
    throw new ValidationError(`${context} validation failed`, errors);
  }
}

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} dateString - Date string
 * @returns {boolean} True if valid
 */
export function isValidDate(dateString) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validate string is not empty
 * @param {string} str - String to validate
 * @returns {boolean} True if non-empty
 */
export function isNonEmptyString(str) {
  return typeof str === 'string' && str.trim().length > 0;
}

/**
 * Validate array is non-empty
 * @param {Array} arr - Array to validate
 * @returns {boolean} True if non-empty array
 */
export function isNonEmptyArray(arr) {
  return Array.isArray(arr) && arr.length > 0;
}

/**
 * Validate phone number (basic)
 * @param {string} phone - Phone number
 * @returns {boolean} True if valid format
 */
export function isValidPhone(phone) {
  // Basic validation: allows numbers, spaces, dashes, parentheses, plus
  const phoneRegex = /^[\d\s\-\(\)\+\.]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

/**
 * Validate that value is within range
 * @param {number} value - Value to check
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} True if in range
 */
export function isInRange(value, min, max) {
  return typeof value === 'number' && value >= min && value <= max;
}

/**
 * Sanitize and validate input string
 * @param {string} input - Input string
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 * @throws {ValidationError} If invalid
 */
export function sanitizeInput(input, maxLength = 1000) {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string');
  }
  
  const trimmed = input.trim();
  
  if (trimmed.length > maxLength) {
    throw new ValidationError(`Input exceeds maximum length of ${maxLength} characters`);
  }
  
  return trimmed;
}

/**
 * Validate object against schema
 * @param {Object} data - Data to validate
 * @param {Object} schema - Schema definition
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateSchema(data, schema) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Data must be an object'] };
  }

  // Check required fields
  if (schema.required) {
    schema.required.forEach((field) => {
      if (!(field in data) || data[field] === undefined || data[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    });
  }

  // Check field types
  if (schema.properties) {
    Object.keys(schema.properties).forEach((field) => {
      if (field in data) {
        const expectedType = schema.properties[field].type;
        const actualType = Array.isArray(data[field]) ? 'array' : typeof data[field];
        
        if (expectedType && expectedType !== actualType) {
          errors.push(`Field '${field}' should be ${expectedType}, got ${actualType}`);
        }
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  validateRequiredFields,
  isValidEmail,
  isValidDate,
  isNonEmptyString,
  isNonEmptyArray,
  isValidPhone,
  isInRange,
  sanitizeInput,
  validateSchema,
};
