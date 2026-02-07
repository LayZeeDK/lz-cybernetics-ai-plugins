/**
 * Video ID extraction utility
 *
 * Extracts YouTube video IDs from various input formats including:
 * - Raw 11-character video IDs
 * - Standard watch URLs (youtube.com/watch?v=...)
 * - Short URLs (youtu.be/...)
 * - Embed URLs (youtube.com/embed/...)
 */

/**
 * Extract video ID from URL or raw ID
 * @param {string} input - Video ID or YouTube URL
 * @returns {string} Video ID
 * @throws {Error} If input is not a valid video ID or URL
 */
export function extractVideoId(input) {
  // If it's already a valid video ID (11 characters)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  // Try to extract from URL
  const urlPatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of urlPatterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1];
    }
  }

  throw new Error(`Invalid video ID or URL: ${input}`);
}
