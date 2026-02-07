#!/usr/bin/env node
/**
 * YouTube Transcript JSON to Markdown Converter
 *
 * Converts YouTube transcript JSON files (exported by the transcript scraper)
 * to well-formatted Markdown documents with chapter sections and timestamped URLs.
 *
 * Usage: node transcript-to-markdown.mjs <input.json>
 * Output: Creates <input>.md in the same directory
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Parse a timestamp string to total seconds.
 * Supports formats: "0:00", "2:41", "1:18:06"
 *
 * @param {string} timestamp - Timestamp in format "H:MM:SS", "M:SS", or "MM:SS"
 * @returns {number} Total seconds
 */
function parseTimestamp(timestamp) {
  const parts = timestamp.split(':').map(Number);

  if (parts.length === 3) {
    // H:MM:SS format
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    // M:SS or MM:SS format
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }

  return 0;
}

/**
 * Format a timestamped YouTube URL for a specific position in the video.
 *
 * @param {string} videoId - YouTube video ID
 * @param {string} timestamp - Timestamp in "M:SS" or "H:MM:SS" format
 * @returns {string} Full YouTube URL with time parameter
 */
function formatTimestampedUrl(videoId, timestamp) {
  const seconds = parseTimestamp(timestamp);
  return `https://www.youtube.com/watch?v=${videoId}&t=${seconds}s`;
}

/**
 * Deduplicate an array of objects by timestamp, keeping the first occurrence.
 * This handles the duplicate chapters/transcript entries from the JSON.
 *
 * @param {Array<{timestamp: string}>} items - Array with timestamp property
 * @returns {Array<{timestamp: string}>} Deduplicated array
 */
function deduplicateByTimestamp(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.timestamp)) {
      return false;
    }
    seen.add(item.timestamp);
    return true;
  });
}

/**
 * Check if a text segment ends with sentence-ending punctuation.
 * Used to detect incomplete phrases that should be moved to the next chapter.
 *
 * @param {string} text - Text to check
 * @returns {boolean} True if the text ends with sentence-ending punctuation
 */
function endsWithCompleteSentence(text) {
  const trimmed = text.trim();
  if (!trimmed) return true; // Empty text is "complete"

  // Sentence-ending punctuation (handles quotes after punctuation too)
  // e.g., "Hello." or 'Hello!' or Hello? or Hello."
  return /[.!?]["']?$/.test(trimmed);
}

/**
 * Move incomplete trailing phrases from each chapter to the next chapter.
 * This ensures sentences that span chapter boundaries are kept together.
 *
 * @param {Array<{timestamp: string, title: string}>} sortedChapters - Chapters sorted by timestamp
 * @param {Map<object, Array>} chapterSegments - Map of chapter -> segments
 * @returns {Map<object, Array>} Updated map with moved segments
 */
function moveIncompletePhrasesToNextChapter(sortedChapters, chapterSegments) {
  // Process chapters in order, moving incomplete trailing segments forward
  for (let i = 0; i < sortedChapters.length - 1; i++) {
    const currentChapter = sortedChapters[i];
    const nextChapter = sortedChapters[i + 1];

    const currentSegments = chapterSegments.get(currentChapter) || [];
    const nextSegments = chapterSegments.get(nextChapter) || [];

    // Find incomplete trailing segments
    const segmentsToMove = [];
    while (currentSegments.length > 0) {
      const lastSegment = currentSegments[currentSegments.length - 1];
      if (endsWithCompleteSentence(lastSegment.text)) {
        break; // Last segment is complete, stop checking
      }
      // Move incomplete segment to the list (will be prepended to next chapter)
      segmentsToMove.unshift(currentSegments.pop());
    }

    // Prepend moved segments to the next chapter
    if (segmentsToMove.length > 0) {
      chapterSegments.set(nextChapter, [...segmentsToMove, ...nextSegments]);
    }
  }

  return chapterSegments;
}

/**
 * Merge transcript segments into a single paragraph of text.
 * Joins segments with spaces for natural reading flow.
 *
 * @param {Array<{text: string}>} segments - Transcript segments
 * @returns {string} Merged paragraph text
 */
function mergeTranscriptSegments(segments) {
  return segments.map((s) => s.text.trim()).join(' ');
}

/**
 * Split text into sentences using punctuation followed by space and capital letter.
 *
 * @param {string} text - Text to split into sentences
 * @returns {Array<string>} Array of sentences
 */
function splitIntoSentences(text) {
  if (!text || !text.trim()) return [];

  // Split on sentence-ending punctuation followed by space and capital letter
  // Handles: "Hello. World" "Hello! World" "Hello? World" "Hello." World"
  const sentenceEndPattern = /([.!?]["']?)\s+(?=[A-Z])/g;

  const sentences = [];
  let lastIndex = 0;
  let match;

  while ((match = sentenceEndPattern.exec(text)) !== null) {
    const sentenceEnd = match.index + match[1].length;
    const sentence = text.substring(lastIndex, sentenceEnd).trim();
    if (sentence) {
      sentences.push(sentence);
    }
    lastIndex = sentenceEnd;
  }

  // Don't forget the last part
  const remaining = text.substring(lastIndex).trim();
  if (remaining) {
    sentences.push(remaining);
  }

  return sentences;
}

/**
 * Group sentences into paragraphs based on minimum character count.
 *
 * @param {Array<string>} sentences - Array of sentences
 * @param {object} options - Configuration options
 * @param {number} options.minChars - Minimum paragraph size before allowing break (default: 800)
 * @returns {Array<string>} Array of paragraph texts
 */
function groupSentencesIntoParagraphs(sentences, options = {}) {
  const { minChars = 800 } = options;

  if (sentences.length === 0) return [];

  const paragraphs = [];
  let currentSentences = [];
  let currentLength = 0;

  for (const sentence of sentences) {
    currentSentences.push(sentence);
    currentLength += sentence.length + 1;

    if (currentLength >= minChars) {
      paragraphs.push(currentSentences.join(' '));
      currentSentences = [];
      currentLength = 0;
    }
  }

  // Don't forget the last paragraph
  if (currentSentences.length > 0) {
    paragraphs.push(currentSentences.join(' '));
  }

  return paragraphs;
}

/**
 * Split transcript segments into paragraphs using text-level sentence detection.
 * Merges all segments, splits at actual sentence boundaries, then groups into paragraphs.
 *
 * @param {Array<{timestamp: string, text: string}>} segments - Transcript segments
 * @param {object} options - Configuration options
 * @returns {Array<string>} Array of paragraph texts
 */
function splitTranscriptIntoParagraphs(segments, options = {}) {
  if (segments.length === 0) {
    return [];
  }

  // Merge all segments into continuous text
  const mergedText = mergeTranscriptSegments(segments);

  // Split into sentences
  const sentences = splitIntoSentences(mergedText);

  // Group sentences into paragraphs
  return groupSentencesIntoParagraphs(sentences, options);
}

/**
 * Assign transcript segments to their respective chapters based on timestamps.
 * Each chapter gets all segments from its timestamp until the next chapter.
 *
 * @param {Array<{timestamp: string, title: string}>} chapters - Deduplicated chapters
 * @param {Array<{timestamp: string, text: string}>} transcript - Deduplicated transcript
 * @returns {Map<object, Array>} Map of chapter -> segments
 */
function assignSegmentsToChapters(chapters, transcript) {
  const result = new Map();

  // Sort chapters by timestamp (in case they're not already sorted)
  const sortedChapters = [...chapters].sort(
    (a, b) => parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp)
  );

  for (let i = 0; i < sortedChapters.length; i++) {
    const chapter = sortedChapters[i];
    const chapterStart = parseTimestamp(chapter.timestamp);
    const chapterEnd =
      i < sortedChapters.length - 1
        ? parseTimestamp(sortedChapters[i + 1].timestamp)
        : Infinity;

    const segments = transcript.filter((seg) => {
      const segTime = parseTimestamp(seg.timestamp);
      return segTime >= chapterStart && segTime < chapterEnd;
    });

    result.set(chapter, segments);
  }

  return result;
}


/**
 * Generate the complete Markdown document from the JSON data.
 *
 * @param {object} data - Parsed JSON data
 * @returns {string} Complete Markdown document
 */
export function generateMarkdown(data) {
  const { videoId, url, title, channelName, channelUrl, duration, description, aiSummary, chapters, transcript } = data;

  const lines = [];

  // Title
  lines.push(`# ${title}`);
  lines.push('');

  // Video link
  lines.push(`[${url}](${url})`);
  lines.push('');

  // Metadata
  lines.push(`**Channel:** [${channelName}](${channelUrl})`);
  lines.push(`**Duration:** ${duration}`);
  lines.push('');

  // Description
  lines.push('## Description');
  lines.push('');
  lines.push(description.trim());
  lines.push('');

  // AI Summary (if available)
  if (aiSummary) {
    lines.push('## AI Summary');
    lines.push('');
    lines.push(aiSummary.trim());
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // Deduplicate chapters and transcript
  const uniqueChapters = deduplicateByTimestamp(chapters || []);
  const uniqueTranscript = deduplicateByTimestamp(transcript || []);

  if (uniqueChapters.length > 0) {
    // Sort chapters by timestamp for processing
    const sortedChapters = [...uniqueChapters].sort(
      (a, b) => parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp)
    );

    // Assign segments to chapters, then move incomplete phrases to next chapter
    const chapterSegments = assignSegmentsToChapters(uniqueChapters, uniqueTranscript);
    moveIncompletePhrasesToNextChapter(sortedChapters, chapterSegments);

    for (const chapter of sortedChapters) {
      const timestampUrl = formatTimestampedUrl(videoId, chapter.timestamp);
      lines.push(`## ${chapter.title} [[${chapter.timestamp}]](${timestampUrl})`);
      lines.push('');

      const segments = chapterSegments.get(chapter) || [];
      if (segments.length > 0) {
        // Split chapter content into multiple paragraphs for better readability
        // splitTranscriptIntoParagraphs now returns strings, not segment arrays
        const paragraphs = splitTranscriptIntoParagraphs(segments);
        for (const paragraph of paragraphs) {
          lines.push(paragraph);
          lines.push('');
        }
      }
    }
  } else {
    // Without chapters: split transcript into paragraphs for readability
    lines.push('## Transcript');
    lines.push('');

    if (uniqueTranscript.length > 0) {
      // splitTranscriptIntoParagraphs now returns strings, not segment arrays
      const paragraphs = splitTranscriptIntoParagraphs(uniqueTranscript);
      for (const paragraph of paragraphs) {
        lines.push(paragraph);
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

/**
 * Main entry point - CLI interface
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('[ERROR] Usage: node transcript-to-markdown.mjs <input.json>');
    process.exit(1);
  }

  const inputPath = path.resolve(args[0]);

  if (!fs.existsSync(inputPath)) {
    console.error(`[ERROR] File not found: ${inputPath}`);
    process.exit(1);
  }

  if (!inputPath.endsWith('.json')) {
    console.error('[ERROR] Input file must be a JSON file');
    process.exit(1);
  }

  // Read and parse JSON
  let data;
  try {
    const content = fs.readFileSync(inputPath, 'utf-8');
    data = JSON.parse(content);
  } catch (error) {
    console.error(`[ERROR] Failed to parse JSON: ${error.message}`);
    process.exit(1);
  }

  // Generate Markdown
  const markdown = generateMarkdown(data);

  // Write output file
  const outputPath = inputPath.replace(/\.json$/, '.md');
  fs.writeFileSync(outputPath, markdown, 'utf-8');

  // Log success with stats
  const uniqueChapters = deduplicateByTimestamp(data.chapters || []).length;
  const uniqueTranscript = deduplicateByTimestamp(data.transcript || []).length;

  console.log(`[OK] Converted: ${path.basename(inputPath)}`);
  console.log(`     -> ${path.basename(outputPath)}`);
  console.log(`     Chapters: ${uniqueChapters} (from ${(data.chapters || []).length} raw)`);
  console.log(`     Transcript segments: ${uniqueTranscript} (from ${(data.transcript || []).length} raw)`);
}

// Only run CLI when executed directly
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  main();
}
