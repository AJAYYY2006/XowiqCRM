/**
 * WhatsApp Click-to-Chat Utilities
 * Phone validation, formatting, and wa.me link generation.
 * Does NOT use WhatsApp Business API — only opens wa.me links in a new tab.
 */

/**
 * Clean a raw phone number string to digits-only with country code.
 * Rules:
 *  - Strip everything except digits
 *  - If leading 0, remove it and prepend default country code (91 = India)
 *  - If number is 10 digits, assume local number → prepend 91
 *  - Returns cleaned string or null if invalid (< 10 digits after cleanup)
 */
export function cleanPhoneNumber(raw, defaultCountryCode = '91') {
  if (!raw) return null
  // Strip all non-digit characters (including +, spaces, dashes)
  let digits = raw.replace(/\D/g, '')

  // Remove leading zero
  if (digits.startsWith('0')) {
    digits = digits.replace(/^0+/, '')
  }

  // If 8–10 digits → assume local, prepend country code
  if (digits.length >= 8 && digits.length <= 10) {
    digits = defaultCountryCode + digits
  }

  // Validate: must be at least 8 digits after cleanup
  if (digits.length < 8) return null

  return digits
}

/**
 * Check if a phone number string is valid (can be cleaned to ≥ 10 digits).
 */
export function isValidPhone(raw) {
  return cleanPhoneNumber(raw) !== null
}

/**
 * Format a clean digits-only phone number for display.
 * e.g. "919876543210" → "+91 98765 43210"
 */
export function formatPhoneDisplay(cleanNumber) {
  if (!cleanNumber) return ''
  // For Indian numbers (12 digits starting with 91): +91 XXXXX XXXXX
  if (cleanNumber.length === 12 && cleanNumber.startsWith('91')) {
    return `+91 ${cleanNumber.slice(2, 7)} ${cleanNumber.slice(7)}`
  }
  // Generic: +CC XXXXXXXXXX
  if (cleanNumber.length > 10) {
    const cc = cleanNumber.slice(0, cleanNumber.length - 10)
    const local = cleanNumber.slice(cleanNumber.length - 10)
    return `+${cc} ${local.slice(0, 5)} ${local.slice(5)}`
  }
  return `+${cleanNumber}`
}

/**
 * Build a wa.me URL for click-to-chat.
 * @param {string} phoneDigits - clean digits-only phone number with country code
 * @param {string} messageText - pre-filled message (will be URL-encoded)
 */
export function buildWhatsAppURL(phoneDigits, messageText = '') {
  const cleaned = cleanPhoneNumber(phoneDigits) || phoneDigits
  let url = `https://wa.me/${cleaned}`
  if (messageText) {
    url += `?text=${encodeURIComponent(messageText)}`
  }
  return url
}

/**
 * Generate the pre-filled message text based on the module context.
 * @param {'customer'|'lead'|'opportunity'} module
 * @param {object} context - { firstName, agentName, businessName, opportunityName }
 */
export function getWhatsAppMessage(module, context = {}) {
  const { firstName = '', agentName = '', businessName = '', opportunityName = '' } = context
  switch (module) {
    case 'customer':
      return `Hi ${firstName}, this is ${agentName} from ${businessName}. `
    case 'lead':
      return `Hi ${firstName}, thanks for your interest in ${businessName}. `
    case 'opportunity':
      return `Hi ${firstName}, following up on ${opportunityName}. `
    default:
      return ''
  }
}
