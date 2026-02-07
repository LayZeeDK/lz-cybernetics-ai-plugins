/**
 * Filename sanitization utility
 *
 * Ensures strings are safe for use as filenames across all platforms
 * by removing problematic characters and normalizing whitespace.
 */

/**
 * Sanitize string for use in filename
 * @param {string} str - Input string
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(str) {
  return str
    // Remove characters illegal in Windows/Unix filenames
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    // Remove emojis (Unicode emoji ranges)
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    // Remove @ symbols
    .replace(/[@]/g, '')
    // Normalize whitespace to hyphens
    .replace(/\s+/g, '-')
    // Collapse multiple hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .trim()
    // Limit length for filesystem compatibility
    .slice(0, 80);
}
