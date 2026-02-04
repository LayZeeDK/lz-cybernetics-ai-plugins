#!/usr/bin/env node
/**
 * PostToolUse Hook - Correction Layer
 *
 * Implements the "Correct" phase of the cybernetic loop:
 * 1. Inspect tool execution results
 * 2. Update history with success/failure status
 * 3. Apply damping for repeated failures
 * 4. Provide corrective feedback to Claude
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { limits } from './shared/invariants.mjs';
import { loadHistory, saveHistory, markLastEntryFailed, getHistoryStats } from './shared/history.mjs';
import { shouldApplyDamping, calculateBackoff } from './shared/controller.mjs';
import { detectLoop } from './shared/detectors.mjs';

/**
 * Check if debug mode is enabled via file flag or environment variable
 * @returns {boolean} Whether debug mode is enabled
 */
function isDebugEnabled() {
  // Check environment variable first
  if (process.env.LZ_CYBERNETICS_DEBUG) {
    return true;
  }
  // Check for debug flag file (works even when env vars aren't inherited)
  const debugFlagPath = join(tmpdir(), 'lz-cybernetics.governor', 'debug-enabled');
  return existsSync(debugFlagPath);
}

// Cache debug state at startup
const DEBUG_ENABLED = isDebugEnabled();

/**
 * Debug logging helper - outputs to stderr when debug is enabled
 * @param  {...any} args - Arguments to log
 */
function debug(...args) {
  if (DEBUG_ENABLED) {
    console.error('[LZ-CYBERNETICS DEBUG post.mjs]', ...args);
  }
}

/**
 * Read JSON input from stdin
 * @returns {Promise<object>} Parsed input
 */
async function readInput() {
  return new Promise((resolve, reject) => {
    let data = '';

    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error(`Failed to parse input JSON: ${error.message}`));
      }
    });
    process.stdin.on('error', reject);
  });
}

/**
 * Detect if tool result indicates a failure
 * @param {any} toolResult - The tool result (may be in different formats)
 * @param {string} toolName - Name of the tool
 * @param {object} fullInput - Full hook input for checking alternative error locations
 * @returns {object} Failure detection result
 */
function detectToolFailure(toolResult, toolName, fullInput = {}) {
  const result = {
    failed: false,
    reason: null,
  };

  // Error patterns to check in string content
  const errorPatterns = [
    /error:/i,
    /failed:/i,
    /exception:/i,
    /not found/i,
    /permission denied/i,
    /no such file/i,
    /eperm/i,           // Windows permission error
    /eacces/i,          // Unix permission error
    /enoent/i,          // File not found
    /operation not permitted/i,
  ];

  /**
   * Check if a string contains error patterns
   */
  function checkStringForErrors(str) {
    if (typeof str !== 'string') return null;
    for (const pattern of errorPatterns) {
      if (pattern.test(str)) {
        return 'Error pattern detected in output';
      }
    }
    return null;
  }

  // Check tool_result (primary location)
  if (toolResult !== null && toolResult !== undefined) {
    if (typeof toolResult === 'string') {
      const errorReason = checkStringForErrors(toolResult);
      if (errorReason) {
        result.failed = true;
        result.reason = errorReason;
        return result;
      }
    } else if (typeof toolResult === 'object') {
      if (toolResult.error) {
        result.failed = true;
        result.reason = typeof toolResult.error === 'string'
          ? toolResult.error
          : 'Error field present in result';
        return result;
      }
      if (toolResult.success === false) {
        result.failed = true;
        result.reason = toolResult.message || 'Success field is false';
        return result;
      }
    }
  }

  // Check alternative error locations (Claude Code may send errors differently)
  const alternativeLocations = [
    fullInput.error,
    fullInput.tool_response?.error,
    fullInput.tool_response?.stderr,
    fullInput.tool_response?.stdout,
    fullInput.result?.error,
  ];

  for (const location of alternativeLocations) {
    if (location) {
      if (typeof location === 'string') {
        const errorReason = checkStringForErrors(location);
        if (errorReason) {
          result.failed = true;
          result.reason = errorReason;
          return result;
        }
      } else if (typeof location === 'object' && location.message) {
        const errorReason = checkStringForErrors(location.message);
        if (errorReason) {
          result.failed = true;
          result.reason = errorReason;
          return result;
        }
      }
    }
  }

  // Check if tool_result is completely absent but we have error indicators
  if ((toolResult === null || toolResult === undefined) && fullInput.error) {
    result.failed = true;
    result.reason = typeof fullInput.error === 'string'
      ? fullInput.error
      : 'Tool returned error';
  }

  return result;
}

/**
 * Generate feedback message based on history analysis
 * @param {object[]} history - Session history
 * @param {string} toolName - Current tool name
 * @param {object} failureInfo - Failure detection result
 * @returns {string|null} Feedback message or null
 */
function generateFeedback(history, toolName, failureInfo) {
  if (!failureInfo.failed) {
    return null;
  }

  const stats = getHistoryStats(history);
  const toolFailures = stats.failureCounts[toolName] || 0;

  const lines = ['[LZ-CYBERNETICS] Tool execution feedback.', ''];

  if (failureInfo.reason) {
    lines.push(`ISSUE: ${failureInfo.reason}`);
    lines.push('');
  }

  if (toolFailures >= 2) {
    lines.push(`WARNING: ${toolName} has failed ${toolFailures + 1} times recently.`);
    lines.push('');
    lines.push('Consider:');
    lines.push('1. Checking if the inputs are correct');
    lines.push('2. Verifying prerequisites are met');
    lines.push('3. Trying an alternative approach');
  }

  return lines.join('\n');
}

/**
 * Main hook logic
 */
async function main() {
  try {
    // Read hook input
    const input = await readInput();

    const toolName = input.tool_name;
    const toolInput = input.tool_input || {};
    const toolResult = input.tool_result;
    const sessionId = input.session_id;
    const hookEvent = input.hook_event_name || 'PostToolUse';

    debug('Input received:', { toolName, sessionId, hookEvent });

    // If this is a PostToolUseFailure event, the tool definitely failed
    let failureInfo;
    if (hookEvent === 'PostToolUseFailure') {
      failureInfo = {
        failed: true,
        reason: input.error?.message || input.error || 'Tool execution failed',
      };
    } else {
      // Detect if the tool failed (pass full input for alternative error locations)
      failureInfo = detectToolFailure(toolResult, toolName, input);
    }

    debug('Failure detection:', JSON.stringify(failureInfo));

    // Update history if there was a failure
    if (failureInfo.failed) {
      markLastEntryFailed(sessionId, toolName, failureInfo.reason);
    }

    // Load updated history and check for patterns
    const history = loadHistory(sessionId);
    const currentCall = {
      tool: toolName,
      input: toolInput,
    };
    const loopInfo = detectLoop(history, currentCall);

    debug('Loop info:', JSON.stringify(loopInfo));
    debug('Should apply damping:', shouldApplyDamping(loopInfo));

    // Check if damping should be applied
    const output = {};

    if (shouldApplyDamping(loopInfo)) {
      const backoffMs = calculateBackoff(loopInfo.consecutive_failures);

      output.systemMessage = [
        '[LZ-CYBERNETICS] Damping applied due to repeated issues.',
        '',
        `Pattern: ${loopInfo.pattern || 'Multiple failures detected'}`,
        `Consecutive failures: ${loopInfo.consecutive_failures}`,
        '',
        'Recommendation: Take a different approach before retrying.',
        '',
        'History stats:',
        `  - Recent calls: ${history.filter(h => h.timestamp >= Date.now() - limits.oscillationWindowMs).length}`,
        `  - Total this session: ${history.length}`,
      ].join('\n');
    } else if (failureInfo.failed) {
      // Generate feedback for failure without damping
      const feedback = generateFeedback(history, toolName, failureInfo);
      if (feedback) {
        output.systemMessage = feedback;
      }
    }

    // Add debug info to output when debug is enabled (appears in Claude's debug log)
    if (DEBUG_ENABLED) {
      output._debug = {
        hook: 'post.mjs',
        toolName,
        hookEvent,
        failureInfo,
        loopInfo,
        dampingApplied: shouldApplyDamping(loopInfo),
      };
    }

    // Output result (if we have feedback or debug info)
    if (output.systemMessage || output._debug) {
      console.log(JSON.stringify(output));
    } else {
      // No issues - minimal output
      console.log(JSON.stringify({}));
    }

    process.exit(0);

  } catch (error) {
    // On error, just log and continue
    const output = {
      systemMessage: `[LZ-CYBERNETICS] PostToolUse hook error: ${error.message}`,
    };
    console.log(JSON.stringify(output));
    process.exit(0);
  }
}

// Run main
main();
