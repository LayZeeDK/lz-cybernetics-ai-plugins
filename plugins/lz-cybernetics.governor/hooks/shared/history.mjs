/**
 * Session History Management
 *
 * Manages tool call history stored in a temp file for
 * cross-call state tracking and oscillation detection.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { limits } from './invariants.mjs';

/**
 * Get the history file path for a session
 * @param {string} sessionId - The session ID
 * @returns {string} Path to the history file
 */
function getHistoryPath(sessionId) {
  const historyDir = join(tmpdir(), 'lz-cybernetics.governor');

  // Ensure directory exists
  if (!existsSync(historyDir)) {
    mkdirSync(historyDir, { recursive: true });
  }

  // Sanitize session ID for use as filename (handle non-string inputs)
  const sessionIdStr = String(sessionId || 'unknown');
  const safeSessionId = sessionIdStr.replace(/[^a-zA-Z0-9-_]/g, '_');
  return join(historyDir, `history-${safeSessionId}.json`);
}

/**
 * Load history for a session
 * @param {string} sessionId - The session ID
 * @returns {object[]} Array of history entries
 */
export function loadHistory(sessionId) {
  if (!sessionId) {
    return [];
  }

  const historyPath = getHistoryPath(sessionId);

  try {
    if (existsSync(historyPath)) {
      const data = readFileSync(historyPath, 'utf-8');
      const history = JSON.parse(data);

      // Validate structure
      if (Array.isArray(history)) {
        return history;
      }
    }
  } catch (error) {
    // If history is corrupted, start fresh
    console.error(`[LZ-CYBERNETICS] Failed to load history: ${error.message}`);
  }

  return [];
}

/**
 * Save history for a session
 * @param {string} sessionId - The session ID
 * @param {object[]} history - Array of history entries
 */
export function saveHistory(sessionId, history) {
  if (!sessionId) {
    return;
  }

  const historyPath = getHistoryPath(sessionId);

  try {
    // Trim history to max size
    const trimmedHistory = history.slice(-limits.maxHistorySize);

    writeFileSync(historyPath, JSON.stringify(trimmedHistory, null, 2), 'utf-8');
  } catch (error) {
    console.error(`[LZ-CYBERNETICS] Failed to save history: ${error.message}`);
  }
}

/**
 * Add an entry to the history
 * @param {string} sessionId - The session ID
 * @param {object} entry - History entry to add
 * @returns {object[]} Updated history
 */
export function addHistoryEntry(sessionId, entry) {
  const history = loadHistory(sessionId);

  // Add timestamp if not present
  const entryWithTimestamp = {
    ...entry,
    timestamp: entry.timestamp || Date.now(),
  };

  history.push(entryWithTimestamp);
  saveHistory(sessionId, history);

  return history;
}

/**
 * Mark the most recent entry as failed
 * @param {string} sessionId - The session ID
 * @param {string} tool - Tool name to mark as failed
 * @param {string} reason - Failure reason
 */
export function markLastEntryFailed(sessionId, tool, reason) {
  const history = loadHistory(sessionId);

  // Find the most recent entry for this tool
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].tool === tool && !history[i].failed) {
      history[i].failed = true;
      history[i].failureReason = reason;
      break;
    }
  }

  saveHistory(sessionId, history);
}

/**
 * Get statistics about recent history
 * @param {object[]} history - Array of history entries
 * @returns {object} History statistics
 */
export function getHistoryStats(history) {
  const now = Date.now();
  const windowStart = now - limits.oscillationWindowMs;

  const recentHistory = history.filter(h => h.timestamp >= windowStart);

  // Count by tool
  const toolCounts = {};
  const failureCounts = {};

  for (const entry of recentHistory) {
    toolCounts[entry.tool] = (toolCounts[entry.tool] || 0) + 1;
    if (entry.failed) {
      failureCounts[entry.tool] = (failureCounts[entry.tool] || 0) + 1;
    }
  }

  return {
    totalCalls: history.length,
    recentCalls: recentHistory.length,
    toolCounts,
    failureCounts,
    windowMs: limits.oscillationWindowMs,
  };
}

/**
 * Clear history for a session
 * @param {string} sessionId - The session ID
 */
export function clearHistory(sessionId) {
  if (!sessionId) {
    return;
  }

  const historyPath = getHistoryPath(sessionId);

  try {
    if (existsSync(historyPath)) {
      writeFileSync(historyPath, '[]', 'utf-8');
    }
  } catch (error) {
    console.error(`[LZ-CYBERNETICS] Failed to clear history: ${error.message}`);
  }
}

/**
 * Create a history entry from a tool call
 * @param {string} tool - Tool name
 * @param {object} input - Tool input
 * @returns {object} History entry
 */
export function createHistoryEntry(tool, input) {
  return {
    tool,
    input: summarizeInput(input),
    timestamp: Date.now(),
    failed: false,
    failureReason: null,
  };
}

/**
 * Summarize tool input for history (avoid storing large content)
 * @param {object} input - Full tool input
 * @returns {object} Summarized input
 */
function summarizeInput(input) {
  if (!input || typeof input !== 'object') {
    return input;
  }

  const summary = {};

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string' && value.length > 200) {
      // Truncate long strings
      summary[key] = value.substring(0, 200) + '...[truncated]';
    } else if (Array.isArray(value)) {
      // Summarize arrays
      summary[key] = `[Array: ${value.length} items]`;
    } else {
      summary[key] = value;
    }
  }

  return summary;
}
