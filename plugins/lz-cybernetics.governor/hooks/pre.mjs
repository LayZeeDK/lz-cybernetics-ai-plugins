#!/usr/bin/env node
/**
 * PreToolUse Hook - Observation & Comparison Layer
 *
 * Implements the "Observe" and "Compare" phases of the cybernetic loop:
 * 1. Parse and validate tool call structure
 * 2. Check against schemas and safety rules
 * 3. Detect patterns (loops, contradictions)
 * 4. Produce error vector and make control decision
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateSchema } from './shared/schema.mjs';
import { isToolAllowed, checkSafetyConstraints } from './shared/invariants.mjs';
import { detectHallucinatedTool, detectLoop, detectContradiction, detectMalformedInput } from './shared/detectors.mjs';
import { makeDecision, Decision } from './shared/controller.mjs';
import { loadHistory, addHistoryEntry, createHistoryEntry } from './shared/history.mjs';

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
 * Debug output goes to stderr but is also included in hook JSON output
 * so it appears in Claude's debug log
 * @param  {...any} args - Arguments to log
 */
function debug(...args) {
  if (DEBUG_ENABLED) {
    console.error('[LZ-CYBERNETICS DEBUG pre.mjs]', ...args);
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
 * Main hook logic
 */
async function main() {
  try {
    // Read hook input
    const input = await readInput();

    const toolName = input.tool_name;
    const toolInput = input.tool_input || {};
    const sessionId = input.session_id;

    debug('Input received:', { toolName, sessionId, inputKeys: Object.keys(toolInput) });

    // Build error vector
    const errorVector = {
      missing_fields: [],
      invalid_values: [],
      forbidden_actions: [],
      loop_detected: false,
      contradiction: null,
    };

    // 1. Check for malformed input
    const malformedIssues = detectMalformedInput(toolInput);
    if (malformedIssues.length > 0) {
      errorVector.invalid_values.push({
        field: 'tool_input',
        reason: malformedIssues.join('; '),
      });
    }

    // 2. Check if tool is hallucinated
    if (detectHallucinatedTool(toolName)) {
      errorVector.forbidden_actions.push(`Unknown tool: ${toolName}`);
    }

    // 3. Check if tool is allowed
    if (!isToolAllowed(toolName)) {
      errorVector.forbidden_actions.push(`Tool not in allowed list: ${toolName}`);
    }

    // 4. Validate against schema
    const schemaResult = validateSchema(toolName, toolInput);
    errorVector.missing_fields.push(...schemaResult.missing_fields);
    errorVector.invalid_values.push(...schemaResult.invalid_values);

    // 5. Check safety constraints
    const safetyViolations = checkSafetyConstraints(toolName, toolInput);
    errorVector.forbidden_actions.push(...safetyViolations);

    // 6. Load history and check for loops
    const history = loadHistory(sessionId);
    const currentCall = {
      tool: toolName,
      input: toolInput,
    };
    const loopInfo = detectLoop(history, currentCall);
    errorVector.loop_detected = loopInfo.loop_detected;

    // 7. Check for contradictions (if plan text is available)
    // Note: plan text would need to be extracted from context
    // For now, this is a placeholder
    const planText = null;
    const contradiction = detectContradiction(planText, toolName, toolInput);
    errorVector.contradiction = contradiction;

    debug('Error vector:', JSON.stringify(errorVector));
    debug('Loop info:', JSON.stringify(loopInfo));

    // 8. Make control decision
    const decision = makeDecision(errorVector, loopInfo);

    debug('Decision:', decision.action, decision.reason || '(no reason)');

    // 9. Record this call in history (before we know if it succeeds)
    const historyEntry = createHistoryEntry(toolName, toolInput);
    addHistoryEntry(sessionId, historyEntry);

    // 10. Output result
    const output = {};

    if (decision.action === Decision.DENY || decision.action === Decision.ESCALATE) {
      output.hookSpecificOutput = {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
      };
      output.systemMessage = decision.systemMessage;

      // Include error vector for debugging
      output.errorVector = errorVector;
    } else if (decision.action === Decision.CORRECT) {
      // Apply corrections if any
      output.hookSpecificOutput = {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        updatedInput: applyCorrections(toolInput, decision.corrections),
      };
      output.systemMessage = decision.systemMessage;
    } else {
      // Allow - minimal output
      output.hookSpecificOutput = {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      };
    }

    // Add debug info to output when debug is enabled (appears in Claude's debug log)
    if (DEBUG_ENABLED) {
      output._debug = {
        hook: 'pre.mjs',
        toolName,
        errorVector,
        loopInfo,
        decision: { action: decision.action, reason: decision.reason },
      };
    }

    console.log(JSON.stringify(output));
    process.exit(0);

  } catch (error) {
    // On error, allow the tool call but log the issue
    const output = {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
      systemMessage: `[LZ-CYBERNETICS] Hook error (allowing call): ${error.message}`,
    };
    console.log(JSON.stringify(output));
    process.exit(0);
  }
}

/**
 * Apply corrections to tool input
 * @param {object} input - Original input
 * @param {object[]} corrections - Corrections to apply
 * @returns {object} Corrected input
 */
function applyCorrections(input, corrections) {
  if (!corrections || corrections.length === 0) {
    return input;
  }

  const corrected = { ...input };

  for (const { field, correction } of corrections) {
    if (correction !== null && correction !== undefined) {
      corrected[field] = correction;
    }
  }

  return corrected;
}

// Run main
main();
