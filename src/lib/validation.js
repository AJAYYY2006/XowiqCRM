/**
 * Centralized Input Validation Utilities for XOWIQ CRM
 * Enforces strict validity for phone numbers, emails, URLs, and required fields.
 */

// Exactly 10 digits, numbers only
export const PHONE_REGEX = /^\d{10}$/

// Standard RFC-compliant email regex (handles Gmail, corporate domains, subdomains)
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

// Valid website link or domain regex (with or without protocol)
export const WEBSITE_REGEX = /^(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/.*)?$/i

/**
 * Strips all non-digit characters and truncates to 10 digits.
 * Useful for controlled inputs on input/change events.
 */
export function sanitizePhone(val) {
  return String(val ?? '').replace(/\D/g, '').slice(0, 10)
}

/**
 * Checks if a phone number is strictly 10 digits (digits only).
 */
export function isValidPhone(val) {
  if (val === null || val === undefined) return false
  const clean = String(val).trim()
  return PHONE_REGEX.test(clean)
}

/**
 * Validates a phone field. Returns { valid: boolean, error?: string }.
 */
export function validatePhone(val, { required = false, label = 'Phone number' } = {}) {
  const clean = String(val ?? '').trim()
  if (!clean) {
    if (required) return { valid: false, error: `${label} is required` }
    return { valid: true }
  }
  if (!PHONE_REGEX.test(clean)) {
    return { valid: false, error: `${label} must be exactly 10 digits (numbers only)` }
  }
  return { valid: true }
}

/**
 * Checks if an email is in a valid format.
 */
export function isValidEmail(val) {
  if (!val) return false
  const clean = String(val).trim()
  return EMAIL_REGEX.test(clean)
}

/**
 * Validates an email field. Returns { valid: boolean, error?: string }.
 */
export function validateEmail(val, { required = false, label = 'Email address' } = {}) {
  const clean = String(val ?? '').trim()
  if (!clean) {
    if (required) return { valid: false, error: `${label} is required` }
    return { valid: true }
  }
  if (!EMAIL_REGEX.test(clean)) {
    return { valid: false, error: `Please enter a valid ${label.toLowerCase()} (e.g. user@gmail.com)` }
  }
  return { valid: true }
}

/**
 * Checks if a website / URL link is valid.
 */
export function isValidWebsite(val) {
  if (!val) return false
  const clean = String(val).trim()
  return WEBSITE_REGEX.test(clean)
}

/**
 * Validates a website link field. Returns { valid: boolean, error?: string }.
 */
export function validateWebsite(val, { required = false, label = 'Website link' } = {}) {
  const clean = String(val ?? '').trim()
  if (!clean) {
    if (required) return { valid: false, error: `${label} is required` }
    return { valid: true }
  }
  if (!WEBSITE_REGEX.test(clean)) {
    return { valid: false, error: `Please enter a valid ${label.toLowerCase()} (e.g. https://company.com or company.com)` }
  }
  return { valid: true }
}

/**
 * Checks non-empty string.
 */
export function validateRequired(val, label = 'Field') {
  const clean = String(val ?? '').trim()
  if (!clean) {
    return { valid: false, error: `${label} cannot be empty` }
  }
  return { valid: true }
}
