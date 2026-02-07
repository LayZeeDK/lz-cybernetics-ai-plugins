#!/usr/bin/env node
/**
 * YouTube to Markdown --InnerTube API Extraction Script
 *
 * Fetches video metadata and transcript from YouTube using the InnerTube API
 * (no browser needed), then generates a structured Markdown document.
 *
 * Usage:
 *   node youtube-to-markdown.mjs <video-id-or-url> [--json] [--output <prefix>]
 *
 * Options:
 *   --json             Also save the intermediate JSON file
 *   --output <prefix>  Use <prefix>.md (and <prefix>.json) instead of auto-naming
 *
 * Examples:
 *   node youtube-to-markdown.mjs SB6cO97tfiY
 *   node youtube-to-markdown.mjs "https://www.youtube.com/watch?v=SB6cO97tfiY" --json
 *   node youtube-to-markdown.mjs SB6cO97tfiY --output my-video
 */

import fs from 'node:fs';
import path from 'node:path';
import { Innertube } from 'youtubei.js';
import getChapters from 'get-youtube-chapters';
import { extractVideoId } from './utils/video-id.mjs';
import { sanitizeFilename } from './utils/filename.mjs';
import { generateMarkdown } from './transcript-to-markdown.mjs';

/**
 * Format a duration in seconds to "M:SS" or "H:MM:SS" string.
 *
 * @param {number} totalSeconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Format milliseconds to a timestamp string "M:SS" or "H:MM:SS".
 *
 * @param {string|number} ms - Milliseconds (may be a string from InnerTube)
 * @returns {string} Formatted timestamp string
 */
function formatMsTimestamp(ms) {
  const totalSeconds = Math.floor(parseInt(ms, 10) / 1000);

  return formatDuration(totalSeconds);
}

/**
 * Parse CLI arguments.
 *
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {{ input: string, json: boolean, output: string|null }}
 */
function parseArgs(argv) {
  let input = null;
  let json = false;
  let output = null;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--json') {
      json = true;
    } else if (argv[i] === '--output' && i + 1 < argv.length) {
      output = argv[i + 1];
      i++; // skip next arg
    } else if (!argv[i].startsWith('--')) {
      input = argv[i];
    }
  }

  return { input, json, output };
}

/**
 * Fetch video metadata and transcript from InnerTube.
 *
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<object>} Video data matching the expected JSON schema
 */
async function fetchVideoData(videoId) {
  console.log(`[INFO] Creating InnerTube client...`);
  const yt = await Innertube.create({ generate_session_locally: true });

  console.log(`[INFO] Fetching video info for ${videoId}...`);
  const info = await yt.getInfo(videoId);

  // Extract metadata
  const title = info.basic_info.title || 'Untitled';
  const channelName = info.basic_info.author || 'Unknown';
  const channelId = info.basic_info.channel_id || '';
  const durationSeconds = info.basic_info.duration || 0;
  const description = info.basic_info.short_description || '';

  const url = `https://www.youtube.com/watch?v=${videoId}&hl=en`;
  const channelUrl = channelId
    ? `https://www.youtube.com/channel/${channelId}`
    : '';
  const duration = formatDuration(durationSeconds);

  console.log(`[INFO] Title: ${title}`);
  console.log(`[INFO] Channel: ${channelName}`);
  console.log(`[INFO] Duration: ${duration}`);

  // Parse chapters from description
  const rawChapters = getChapters(description);
  const chapters = rawChapters.map((ch) => ({
    timestamp: formatDuration(ch.start),
    title: ch.title,
  }));
  console.log(`[INFO] Chapters found: ${chapters.length}`);

  // Fetch transcript --try caption track URLs first (no auth needed),
  // fall back to getTranscript() which requires an authenticated session.
  let transcript = [];

  const captionTracks = info.captions?.caption_tracks;

  if (captionTracks && captionTracks.length > 0) {
    // Prefer English, fall back to first available track
    const englishTrack = captionTracks.find((t) => t.language_code === 'en')
      || captionTracks.find((t) => t.language_code?.startsWith('en'))
      || captionTracks[0];

    console.log(`[INFO] Fetching transcript via caption track (${englishTrack.language_code})...`);

    try {
      const jsonUrl = englishTrack.base_url + '&fmt=json3';
      const resp = await fetch(jsonUrl);

      if (!resp.ok) {
        throw new Error(`Caption fetch failed with status ${resp.status}`);
      }

      const data = await resp.json();
      const events = data.events?.filter((e) => e.segs) || [];

      if (events.length > 0) {
        transcript = events.map((evt) => ({
          timestamp: formatMsTimestamp(String(evt.tStartMs || 0)),
          text: evt.segs.map((s) => s.utf8 || '').join('').trim(),
        })).filter((seg) => seg.text.length > 0);

        console.log(`[INFO] Transcript segments: ${transcript.length}`);
      } else {
        console.log(`[WARN] Caption track returned but has no segments.`);
      }
    } catch (error) {
      console.log(`[WARN] Caption track fetch failed: ${error.message}`);
      console.log(`[INFO] Trying getTranscript() fallback...`);

      try {
        const transcriptInfo = await info.getTranscript();
        const segments = transcriptInfo?.transcript?.content?.body?.initial_segments;

        if (segments && segments.length > 0) {
          transcript = segments.map((segment) => ({
            timestamp: formatMsTimestamp(segment.start_ms),
            text: segment.snippet?.toString() ?? '',
          }));
          console.log(`[INFO] Transcript segments (via fallback): ${transcript.length}`);
        }
      } catch (fallbackError) {
        console.log(`[WARN] getTranscript() fallback also failed: ${fallbackError.message}`);
      }
    }
  } else {
    console.log(`[WARN] No caption tracks available for this video.`);

    // Last resort: try getTranscript() in case the session is authenticated
    try {
      console.log(`[INFO] Trying getTranscript() (requires authenticated session)...`);
      const transcriptInfo = await info.getTranscript();
      const segments = transcriptInfo?.transcript?.content?.body?.initial_segments;

      if (segments && segments.length > 0) {
        transcript = segments.map((segment) => ({
          timestamp: formatMsTimestamp(segment.start_ms),
          text: segment.snippet?.toString() ?? '',
        }));
        console.log(`[INFO] Transcript segments: ${transcript.length}`);
      }
    } catch (error) {
      console.log(`[WARN] Could not fetch transcript: ${error.message}`);
      console.log(`[WARN] The video may not have captions/subtitles available.`);
    }
  }

  return {
    videoId,
    url,
    title,
    channelName,
    channelUrl,
    duration,
    description,
    aiSummary: null,
    chapters,
    transcript,
  };
}

/**
 * Determine the output file paths based on CLI options and video title.
 *
 * @param {string} title - Video title
 * @param {string} videoId - Video ID
 * @param {string|null} outputPrefix - User-specified output prefix, or null
 * @returns {{ mdPath: string, jsonPath: string }}
 */
function resolveOutputPaths(title, videoId, outputPrefix) {
  if (outputPrefix) {
    const resolved = path.resolve(outputPrefix);

    return {
      mdPath: `${resolved}.md`,
      jsonPath: `${resolved}.json`,
    };
  }

  const sanitized = sanitizeFilename(title);
  const basename = `${sanitized}-${videoId}`;

  return {
    mdPath: path.resolve(basename + '.md'),
    jsonPath: path.resolve(basename + '.json'),
  };
}

/**
 * Main entry point.
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.input) {
    console.error('[ERROR] Usage: node youtube-to-markdown.mjs <video-id-or-url> [--json] [--output <prefix>]');
    process.exit(1);
  }

  // Extract video ID
  let videoId;

  try {
    videoId = extractVideoId(args.input);
  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    process.exit(1);
  }

  console.log(`[INFO] Video ID: ${videoId}`);

  // Fetch video data
  let data;

  try {
    data = await fetchVideoData(videoId);
  } catch (error) {
    console.error(`[ERROR] Failed to fetch video data: ${error.message}`);

    if (error.message.includes('private') || error.message.includes('unavailable')) {
      console.error('[ERROR] The video may be private, deleted, or region-restricted.');
    }

    process.exit(1);
  }

  // Resolve output paths
  const { mdPath, jsonPath } = resolveOutputPaths(data.title, videoId, args.output);

  // Optionally save JSON
  if (args.json) {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[OK] JSON saved: ${path.basename(jsonPath)}`);
  }

  // Generate and save Markdown
  const markdown = generateMarkdown(data);
  fs.writeFileSync(mdPath, markdown, 'utf-8');
  console.log(`[OK] Markdown saved: ${path.basename(mdPath)}`);

  // Log summary
  console.log('');
  console.log(`[OK] Done!`);
  console.log(`     Video:     ${data.title}`);
  console.log(`     Chapters:  ${data.chapters.length}`);
  console.log(`     Segments:  ${data.transcript.length}`);

  if (data.transcript.length === 0) {
    console.log(`[WARN] No transcript was available. Markdown contains metadata only.`);
  }
}

main();
