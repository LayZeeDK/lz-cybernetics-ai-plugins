/**
 * Pattern Detectors
 *
 * Implements detection for malformed JSON, hallucinated tools,
 * repeated patterns, and contradictions between plan and action.
 */

import { isToolAllowed } from './invariants.mjs';
import { limits } from './invariants.mjs';

/**
 * Detect if a tool name is hallucinated (not a real tool)
 * @param {string} toolName - Name of the tool
 * @returns {boolean} Whether the tool appears to be hallucinated
 */
export function detectHallucinatedTool(toolName) {
  if (!toolName || typeof toolName !== 'string') {
    return true;
  }

  // MCP tools have format: mcp__server__tool - check format first
  if (toolName.startsWith('mcp__')) {
    const parts = toolName.split('__');
    // Valid MCP tool should have at least 3 parts (mcp, server, tool)
    return parts.length < 3;
  }

  // Check if it's a known built-in tool
  if (isToolAllowed(toolName)) {
    return false;
  }

  return true;
}

/**
 * Detect repeated/loop patterns in history
 * @param {object[]} history - Array of previous tool calls
 * @param {object} currentCall - Current tool call being evaluated
 * @returns {object} Loop detection result
 */
export function detectLoop(history, currentCall) {
  const result = {
    loop_detected: false,
    consecutive_failures: 0,
    similar_calls_count: 0,
    pattern: null,
    pattern_tools: [],              // Tools involved in detected pattern
    current_continues_pattern: false, // Whether current call continues the loop
  };

  if (!history || history.length === 0) {
    return result;
  }

  const now = Date.now();
  const windowStart = now - limits.oscillationWindowMs;

  // Filter to recent history within oscillation window
  const recentHistory = history.filter(h => h.timestamp >= windowStart);

  // Count consecutive failures for the same tool
  let consecutiveFailures = 0;
  for (let i = recentHistory.length - 1; i >= 0; i--) {
    const entry = recentHistory[i];
    if (entry.tool === currentCall.tool && entry.failed) {
      consecutiveFailures++;
    } else {
      break;
    }
  }
  result.consecutive_failures = consecutiveFailures;

  // Count similar calls (same tool, similar input hash)
  const currentHash = hashToolInput(currentCall.tool, currentCall.input);
  const similarCalls = recentHistory.filter(h => {
    const historyHash = hashToolInput(h.tool, h.input);
    return historyHash === currentHash;
  });
  result.similar_calls_count = similarCalls.length;

  // Detect oscillation pattern (A -> B -> A -> B)
  if (recentHistory.length >= 4) {
    const last4 = recentHistory.slice(-4);

    if (last4[0].tool === last4[2].tool && last4[1].tool === last4[3].tool && last4[0].tool !== last4[1].tool) {
      result.loop_detected = true;
      result.pattern = `Oscillation: ${last4[0].tool} <-> ${last4[1].tool}`;
      result.pattern_tools = [last4[0].tool, last4[1].tool];
      result.current_continues_pattern = result.pattern_tools.includes(currentCall.tool);
    }
  }

  // Detect simple repetition (same call multiple times)
  if (result.similar_calls_count >= limits.maxRetries) {
    result.loop_detected = true;
    result.pattern = `Repeated call: ${currentCall.tool} (${result.similar_calls_count} times)`;
    result.pattern_tools = [currentCall.tool];
    result.current_continues_pattern = true; // By definition, same call continues pattern
  }

  // Detect consecutive failures
  if (consecutiveFailures >= limits.maxConsecutiveFailures) {
    result.loop_detected = true;
    result.pattern = `Consecutive failures: ${currentCall.tool} (${consecutiveFailures} times)`;
    result.pattern_tools = [currentCall.tool];
    result.current_continues_pattern = true; // By definition, same tool continues pattern
  }

  return result;
}

/**
 * Detect contradiction between stated plan and actual action
 * @param {string|null} plan - Stated plan text (if available)
 * @param {string} toolName - Tool being called
 * @param {object} toolInput - Tool input parameters
 * @returns {string|null} Contradiction description or null
 */
export function detectContradiction(plan, toolName, toolInput) {
  if (!plan || typeof plan !== 'string') {
    return null;
  }

  const planLower = plan.toLowerCase();

  // Check for read-only plan but write action
  const readOnlyIndicators = ['just read', 'only read', 'examine', 'look at', 'check the'];
  const writeTools = ['Write', 'Edit', 'Bash'];

  if (writeTools.includes(toolName)) {
    for (const indicator of readOnlyIndicators) {
      if (planLower.includes(indicator)) {
        return `Plan indicates read-only operation ("${indicator}") but attempting ${toolName}`;
      }
    }
  }

  // Check for specific file mention but different file accessed
  const fileMatch = plan.match(/(?:file|read|edit|write)\s+[`"']?([^\s`"']+\.\w+)[`"']?/i);
  if (fileMatch && toolInput.file_path) {
    const plannedFile = fileMatch[1];
    const actualFile = toolInput.file_path.split('/').pop();

    if (plannedFile !== actualFile && !toolInput.file_path.includes(plannedFile)) {
      return `Plan mentions "${plannedFile}" but accessing "${actualFile}"`;
    }
  }

  return null;
}

/**
 * Create a hash of tool input for comparison
 * @param {string} tool - Tool name
 * @param {object} input - Tool input
 * @returns {string} Hash string
 */
function hashToolInput(tool, input) {
  // Simple hash based on tool name and key input fields
  const keyFields = {
    Read: ['file_path'],
    Write: ['file_path'],
    Edit: ['file_path', 'old_string'],
    Bash: ['command'],
    Glob: ['pattern', 'path'],
    Grep: ['pattern', 'path'],
  };

  const fields = keyFields[tool] || Object.keys(input || {}).slice(0, 3);
  const values = fields.map(f => input?.[f] || '').join('|');

  return `${tool}:${values}`;
}

/**
 * Detect malformed input structure
 * @param {any} input - Raw input to validate
 * @returns {string[]} List of structural issues
 */
export function detectMalformedInput(input) {
  const issues = [];

  if (input === null || input === undefined) {
    issues.push('Input is null or undefined');
    return issues;
  }

  if (typeof input !== 'object') {
    issues.push(`Input is not an object (got ${typeof input})`);
    return issues;
  }

  if (Array.isArray(input)) {
    issues.push('Input is an array, expected object');
    return issues;
  }

  return issues;
}
