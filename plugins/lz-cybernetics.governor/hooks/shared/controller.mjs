/**
 * Controller Logic
 *
 * Implements rejection, auto-correction, escalation,
 * and damping/backoff strategies for the cybernetic loop.
 */

import { limits } from './invariants.mjs';

/**
 * Decision types for the controller
 */
export const Decision = {
  ALLOW: 'allow',
  DENY: 'deny',
  CORRECT: 'correct',
  ESCALATE: 'escalate',
};

/**
 * Make a control decision based on the error vector
 * @param {object} errorVector - The error vector from validation
 * @param {object} loopInfo - Loop detection information
 * @returns {object} Control decision with action and details
 */
export function makeDecision(errorVector, loopInfo) {
  const decision = {
    action: Decision.ALLOW,
    reason: null,
    corrections: null,
    systemMessage: null,
  };

  // Check for critical errors that require denial
  if (errorVector.forbidden_actions && errorVector.forbidden_actions.length > 0) {
    decision.action = Decision.DENY;
    decision.reason = `Forbidden action detected: ${errorVector.forbidden_actions.join(', ')}`;
    decision.systemMessage = formatDenialMessage(errorVector, 'forbidden_action');
    return decision;
  }

  // Check for loop/oscillation - escalate only if current action continues the pattern
  if (loopInfo && loopInfo.loop_detected) {
    if (loopInfo.current_continues_pattern) {
      // Current action would continue the loop - block it
      decision.action = Decision.ESCALATE;
      decision.reason = loopInfo.pattern;
      decision.systemMessage = formatEscalationMessage(loopInfo);
      return decision;
    } else {
      // Current action breaks the loop - allow it but note the pattern was detected
      decision.systemMessage = formatBreakoutMessage(loopInfo);
      // Don't return - continue with other checks but allow the tool
    }
  }

  // Check for missing required fields
  if (errorVector.missing_fields && errorVector.missing_fields.length > 0) {
    decision.action = Decision.DENY;
    decision.reason = `Missing required fields: ${errorVector.missing_fields.join(', ')}`;
    decision.systemMessage = formatDenialMessage(errorVector, 'missing_fields');
    return decision;
  }

  // Check for type errors
  if (errorVector.invalid_values && errorVector.invalid_values.length > 0) {
    // Some type errors might be correctable
    const correctable = errorVector.invalid_values.filter(v => canAutoCorrect(v));
    const uncorrectable = errorVector.invalid_values.filter(v => !canAutoCorrect(v));

    if (uncorrectable.length > 0) {
      decision.action = Decision.DENY;
      decision.reason = `Invalid values: ${uncorrectable.map(v => v.field).join(', ')}`;
      decision.systemMessage = formatDenialMessage(errorVector, 'invalid_values');
      return decision;
    }

    if (correctable.length > 0) {
      decision.action = Decision.CORRECT;
      decision.corrections = correctable.map(v => ({
        field: v.field,
        correction: suggestCorrection(v),
      }));
      decision.systemMessage = formatCorrectionMessage(correctable);
      return decision;
    }
  }

  // Check for contradiction
  if (errorVector.contradiction) {
    decision.action = Decision.DENY;
    decision.reason = errorVector.contradiction;
    decision.systemMessage = formatContradictionMessage(errorVector.contradiction);
    return decision;
  }

  return decision;
}

/**
 * Check if a validation error can be auto-corrected
 * @param {object} validationError - The validation error
 * @returns {boolean} Whether it can be auto-corrected
 */
function canAutoCorrect(validationError) {
  // Currently, we don't auto-correct - all errors require Claude to fix
  // This could be extended to handle simple cases like:
  // - string -> number conversion for clearly numeric values
  // - trimming whitespace
  // - normalizing paths
  return false;
}

/**
 * Suggest a correction for a validation error
 * @param {object} validationError - The validation error
 * @returns {any} Suggested correction
 */
function suggestCorrection(validationError) {
  // Placeholder for future auto-correction logic
  return null;
}

/**
 * Format denial message for Claude
 * @param {object} errorVector - The error vector
 * @param {string} primaryReason - Primary reason for denial
 * @returns {string} Formatted message
 */
function formatDenialMessage(errorVector, primaryReason) {
  const lines = ['[LZ-CYBERNETICS] Tool call validation failed.', ''];

  if (primaryReason === 'forbidden_action') {
    lines.push('FORBIDDEN ACTION DETECTED:');
    for (const action of errorVector.forbidden_actions) {
      lines.push(`  - ${action}`);
    }
    lines.push('');
    lines.push('This action violates safety constraints. Please use a different approach.');
  }

  if (primaryReason === 'missing_fields') {
    lines.push('MISSING REQUIRED FIELDS:');
    for (const field of errorVector.missing_fields) {
      lines.push(`  - ${field}`);
    }
    lines.push('');
    lines.push('Please provide all required fields and retry.');
  }

  if (primaryReason === 'invalid_values') {
    lines.push('INVALID VALUES:');
    for (const v of errorVector.invalid_values) {
      if (v.reason === 'forbidden') {
        lines.push(`  - ${v.field}: forbidden field`);
      } else {
        lines.push(`  - ${v.field}: expected ${v.expected}, got ${v.got}`);
      }
    }
    lines.push('');
    lines.push('Please correct the field types and retry.');
  }

  return lines.join('\n');
}

/**
 * Format escalation message for loop detection
 * @param {object} loopInfo - Loop detection information
 * @returns {string} Formatted message
 */
function formatEscalationMessage(loopInfo) {
  const lines = [
    '[LZ-CYBERNETICS] Oscillation/loop pattern detected.',
    '',
    `PATTERN: ${loopInfo.pattern}`,
    '',
    'The system has detected a repeated failure pattern. To break this cycle:',
    '1. Step back and reconsider the approach',
    '2. Try a fundamentally different strategy',
    '3. Ask the user for clarification if needed',
    '',
    `Consecutive failures: ${loopInfo.consecutive_failures}`,
    `Similar calls in window: ${loopInfo.similar_calls_count}`,
  ];

  return lines.join('\n');
}

/**
 * Format breakout message when pattern detected but current action breaks it
 * @param {object} loopInfo - Loop detection information
 * @returns {string} Formatted message
 */
function formatBreakoutMessage(loopInfo) {
  const patternTools = loopInfo.pattern_tools || [];
  const lines = [
    '[LZ-CYBERNETICS] Pattern detected but current action allowed.',
    '',
    `DETECTED PATTERN: ${loopInfo.pattern}`,
    `PATTERN TOOLS: ${patternTools.join(', ') || 'unknown'}`,
    '',
    'Your current action uses a different tool, which breaks the loop.',
    'Proceeding with this approach.',
  ];

  return lines.join('\n');
}

/**
 * Format contradiction message
 * @param {string} contradiction - The contradiction description
 * @returns {string} Formatted message
 */
function formatContradictionMessage(contradiction) {
  const lines = [
    '[LZ-CYBERNETICS] Contradiction detected between plan and action.',
    '',
    `CONTRADICTION: ${contradiction}`,
    '',
    'The current action does not match the stated plan. Please either:',
    '1. Update your plan to reflect the intended action',
    '2. Modify the action to match your plan',
  ];

  return lines.join('\n');
}

/**
 * Format correction message
 * @param {object[]} corrections - List of corrections applied
 * @returns {string} Formatted message
 */
function formatCorrectionMessage(corrections) {
  const lines = [
    '[LZ-CYBERNETICS] Auto-corrections applied.',
    '',
    'The following fields were automatically corrected:',
  ];

  for (const c of corrections) {
    lines.push(`  - ${c.field}: ${JSON.stringify(c.correction)}`);
  }

  return lines.join('\n');
}

/**
 * Calculate backoff delay based on failure count
 * @param {number} failureCount - Number of consecutive failures
 * @returns {number} Delay in milliseconds
 */
export function calculateBackoff(failureCount) {
  // Exponential backoff with jitter, capped at 30 seconds
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds

  const exponentialDelay = baseDelay * Math.pow(2, failureCount - 1);
  const jitter = Math.random() * 0.3 * exponentialDelay;

  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Determine if damping should be applied
 * @param {object} loopInfo - Loop detection information
 * @returns {boolean} Whether to apply damping
 */
export function shouldApplyDamping(loopInfo) {
  if (!loopInfo) return false;

  return (
    loopInfo.consecutive_failures >= limits.maxConsecutiveFailures ||
    loopInfo.similar_calls_count >= limits.maxRetries ||
    loopInfo.loop_detected
  );
}
