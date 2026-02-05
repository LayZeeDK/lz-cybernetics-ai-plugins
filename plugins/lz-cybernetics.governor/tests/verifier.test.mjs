/**
 * Verifier Tests
 *
 * Test categories from the draft:
 * - valid tool calls
 * - missing fields
 * - invalid types
 * - forbidden actions
 * - oscillation detection
 * - contradiction detection
 * - auto-correction behavior
 * - rejection behavior
 * - fallback behavior
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSchema, getSchema } from '../hooks/shared/schema.mjs';
import { isToolAllowed, checkSafetyConstraints } from '../hooks/shared/invariants.mjs';
import { detectHallucinatedTool, detectLoop, detectContradiction, detectMalformedInput } from '../hooks/shared/detectors.mjs';
import { makeDecision, Decision, shouldApplyDamping } from '../hooks/shared/controller.mjs';
import { limits } from '../hooks/shared/invariants.mjs';
import { getHistoryStats } from '../hooks/shared/history.mjs';

// ============================================================
// Schema Validation Tests
// ============================================================

describe('validateSchema', () => {
  test('valid Read call passes', () => {
    const result = validateSchema('Read', { file_path: '/test/file.txt' });
    assert.deepEqual(result.missing_fields, []);
    assert.deepEqual(result.invalid_values, []);
  });

  test('missing required field detected', () => {
    const result = validateSchema('Read', {});
    assert.deepEqual(result.missing_fields, ['file_path']);
  });

  test('invalid type detected', () => {
    const result = validateSchema('Read', { file_path: 123 });
    assert.equal(result.invalid_values.length, 1);
    assert.equal(result.invalid_values[0].field, 'file_path');
    assert.equal(result.invalid_values[0].expected, 'string');
    assert.equal(result.invalid_values[0].got, 'number');
  });

  test('Write requires file_path and content', () => {
    const result = validateSchema('Write', { file_path: '/test.txt' });
    assert.deepEqual(result.missing_fields, ['content']);
  });

  test('Edit requires file_path, old_string, new_string', () => {
    const result = validateSchema('Edit', { file_path: '/test.txt' });
    assert.ok(result.missing_fields.includes('old_string'));
    assert.ok(result.missing_fields.includes('new_string'));
  });

  test('unknown tool returns empty schema', () => {
    const schema = getSchema('UnknownTool');
    assert.deepEqual(schema.required, []);
  });

  test('MCP tool returns permissive schema', () => {
    const schema = getSchema('mcp__server__tool');
    assert.deepEqual(schema.required, []);
  });
});

// ============================================================
// Invariants Tests
// ============================================================

describe('isToolAllowed', () => {
  test('built-in tools allowed', () => {
    assert.ok(isToolAllowed('Read'));
    assert.ok(isToolAllowed('Write'));
    assert.ok(isToolAllowed('Edit'));
    assert.ok(isToolAllowed('Bash'));
    assert.ok(isToolAllowed('Glob'));
    assert.ok(isToolAllowed('Grep'));
  });

  test('MCP tools allowed by default', () => {
    assert.ok(isToolAllowed('mcp__server__any_tool'));
    assert.ok(isToolAllowed('mcp__database__query'));
  });

  test('unknown tools not allowed', () => {
    assert.ok(!isToolAllowed('FakeToolThatDoesNotExist'));
  });
});

describe('checkSafetyConstraints', () => {
  test('detects .env file', () => {
    const violations = checkSafetyConstraints('Write', { file_path: '/project/.env' });
    assert.ok(violations.length > 0);
    assert.ok(violations[0].includes('Sensitive file'));
  });

  test('detects credentials file', () => {
    const violations = checkSafetyConstraints('Write', { file_path: '/app/credentials.json' });
    assert.ok(violations.length > 0);
  });

  test('allows normal files', () => {
    const violations = checkSafetyConstraints('Write', { file_path: '/src/index.js' });
    assert.deepEqual(violations, []);
  });

  test('detects dangerous rm command', () => {
    const violations = checkSafetyConstraints('Bash', { command: 'rm -rf /' });
    assert.ok(violations.length > 0);
  });

  test('detects dangerous PowerShell Remove-Item', () => {
    const violations = checkSafetyConstraints('Bash', { command: 'Remove-Item -Recurse -Force C:\\' });
    assert.ok(violations.length > 0);
  });

  test('detects dangerous PowerShell Remove-Item with different flag order', () => {
    const violations = checkSafetyConstraints('Bash', { command: 'Remove-Item C:\\ -Recurse -Force' });
    assert.ok(violations.length > 0);
  });

  test('detects dangerous rd /s command', () => {
    const violations = checkSafetyConstraints('Bash', { command: 'rd /s C:\\' });
    assert.ok(violations.length > 0);
  });

  test('detects dangerous Format-Volume', () => {
    const violations = checkSafetyConstraints('Bash', { command: 'Format-Volume -DriveLetter D' });
    assert.ok(violations.length > 0);
  });

  test('allows safe commands', () => {
    const violations = checkSafetyConstraints('Bash', { command: 'ls -la' });
    assert.deepEqual(violations, []);
  });

  test('allows safe PowerShell commands', () => {
    const violations = checkSafetyConstraints('Bash', { command: 'Get-ChildItem C:\\Users' });
    assert.deepEqual(violations, []);
  });
});

// ============================================================
// Detectors Tests
// ============================================================

describe('detectHallucinatedTool', () => {
  test('null tool is hallucinated', () => {
    assert.ok(detectHallucinatedTool(null));
    assert.ok(detectHallucinatedTool(undefined));
    assert.ok(detectHallucinatedTool(''));
  });

  test('valid tools not hallucinated', () => {
    assert.ok(!detectHallucinatedTool('Read'));
    assert.ok(!detectHallucinatedTool('Write'));
    assert.ok(!detectHallucinatedTool('mcp__server__tool'));
  });

  test('invalid MCP format is hallucinated', () => {
    assert.ok(detectHallucinatedTool('mcp__incomplete'));
  });
});

describe('detectLoop', () => {
  test('empty history returns no loop', () => {
    const result = detectLoop([], { tool: 'Read', input: {} });
    assert.equal(result.loop_detected, false);
  });

  test('detects consecutive failures', () => {
    const now = Date.now();
    const history = [
      { tool: 'Edit', input: {}, timestamp: now - 1000, failed: true },
      { tool: 'Edit', input: {}, timestamp: now - 500, failed: true },
      { tool: 'Edit', input: {}, timestamp: now - 100, failed: true },
    ];

    const result = detectLoop(history, { tool: 'Edit', input: {} });
    assert.equal(result.consecutive_failures, 3);
  });

  test('detects oscillation pattern', () => {
    const now = Date.now();
    const history = [
      { tool: 'Read', input: {}, timestamp: now - 4000, failed: false },
      { tool: 'Write', input: {}, timestamp: now - 3000, failed: false },
      { tool: 'Read', input: {}, timestamp: now - 2000, failed: false },
      { tool: 'Write', input: {}, timestamp: now - 1000, failed: false },
    ];

    const result = detectLoop(history, { tool: 'Read', input: {} });
    assert.ok(result.loop_detected);
    assert.ok(result.pattern.includes('Oscillation'));
  });

  test('oscillation pattern tracks pattern_tools and current_continues_pattern', () => {
    const now = Date.now();
    const history = [
      { tool: 'Read', input: {}, timestamp: now - 4000, failed: false },
      { tool: 'Edit', input: {}, timestamp: now - 3000, failed: false },
      { tool: 'Read', input: {}, timestamp: now - 2000, failed: false },
      { tool: 'Edit', input: {}, timestamp: now - 1000, failed: false },
    ];

    // Current tool is Read (part of the pattern)
    const resultContinues = detectLoop(history, { tool: 'Read', input: {} });
    assert.ok(resultContinues.loop_detected);
    assert.deepEqual(resultContinues.pattern_tools, ['Read', 'Edit']);
    assert.equal(resultContinues.current_continues_pattern, true);

    // Current tool is Bash (NOT part of the pattern - breaks the loop)
    const resultBreaks = detectLoop(history, { tool: 'Bash', input: { command: 'npm test' } });
    assert.ok(resultBreaks.loop_detected);
    assert.deepEqual(resultBreaks.pattern_tools, ['Read', 'Edit']);
    assert.equal(resultBreaks.current_continues_pattern, false);
  });
});

describe('detectContradiction', () => {
  test('detects read-only plan with write action', () => {
    const contradiction = detectContradiction('just read the file', 'Write', {});
    assert.ok(contradiction !== null);
    assert.ok(contradiction.includes('read-only'));
  });

  test('null plan returns no contradiction', () => {
    const contradiction = detectContradiction(null, 'Write', {});
    assert.equal(contradiction, null);
  });
});

describe('detectMalformedInput', () => {
  test('null input is malformed', () => {
    const issues = detectMalformedInput(null);
    assert.ok(issues.length > 0);
  });

  test('array input is malformed', () => {
    const issues = detectMalformedInput([1, 2, 3]);
    assert.ok(issues.length > 0);
    assert.ok(issues[0].includes('array'));
  });

  test('valid object passes', () => {
    const issues = detectMalformedInput({ file_path: '/test' });
    assert.deepEqual(issues, []);
  });
});

// ============================================================
// Controller Tests
// ============================================================

describe('makeDecision', () => {
  test('empty error vector allows', () => {
    const errorVector = {
      missing_fields: [],
      invalid_values: [],
      forbidden_actions: [],
      loop_detected: false,
      contradiction: null,
    };

    const decision = makeDecision(errorVector, null);
    assert.equal(decision.action, Decision.ALLOW);
  });

  test('forbidden action denies', () => {
    const errorVector = {
      missing_fields: [],
      invalid_values: [],
      forbidden_actions: ['Dangerous operation'],
      loop_detected: false,
      contradiction: null,
    };

    const decision = makeDecision(errorVector, null);
    assert.equal(decision.action, Decision.DENY);
    assert.ok(decision.systemMessage.includes('FORBIDDEN'));
  });

  test('missing fields denies', () => {
    const errorVector = {
      missing_fields: ['file_path'],
      invalid_values: [],
      forbidden_actions: [],
      loop_detected: false,
      contradiction: null,
    };

    const decision = makeDecision(errorVector, null);
    assert.equal(decision.action, Decision.DENY);
    assert.ok(decision.systemMessage.includes('MISSING'));
  });

  test('loop detected escalates when current action continues pattern', () => {
    const errorVector = {
      missing_fields: [],
      invalid_values: [],
      forbidden_actions: [],
      loop_detected: false,
      contradiction: null,
    };

    const loopInfo = {
      loop_detected: true,
      pattern: 'Test oscillation',
      consecutive_failures: 3,
      similar_calls_count: 5,
      pattern_tools: ['Read', 'Edit'],
      current_continues_pattern: true, // Current action continues the loop
    };

    const decision = makeDecision(errorVector, loopInfo);
    assert.equal(decision.action, Decision.ESCALATE);
    assert.ok(decision.systemMessage.includes('Oscillation'));
  });

  test('loop detected allows when current action breaks pattern', () => {
    const errorVector = {
      missing_fields: [],
      invalid_values: [],
      forbidden_actions: [],
      loop_detected: false,
      contradiction: null,
    };

    const loopInfo = {
      loop_detected: true,
      pattern: 'Oscillation: Read <-> Edit',
      consecutive_failures: 0,
      similar_calls_count: 4,
      pattern_tools: ['Read', 'Edit'],
      current_continues_pattern: false, // Current action (e.g., Bash) breaks the loop
    };

    const decision = makeDecision(errorVector, loopInfo);
    assert.equal(decision.action, Decision.ALLOW);
    assert.ok(decision.systemMessage.includes('Pattern detected but current action allowed'));
  });

  test('contradiction denies', () => {
    const errorVector = {
      missing_fields: [],
      invalid_values: [],
      forbidden_actions: [],
      loop_detected: false,
      contradiction: 'Plan says read but action is write',
    };

    const decision = makeDecision(errorVector, null);
    assert.equal(decision.action, Decision.DENY);
    assert.ok(decision.systemMessage.includes('Contradiction'));
  });
});

// ============================================================
// Damping Threshold Tests
// ============================================================

describe('shouldApplyDamping', () => {
  test('returns false when loopInfo is null', () => {
    assert.equal(shouldApplyDamping(null), false);
  });

  test('returns false when loopInfo is undefined', () => {
    assert.equal(shouldApplyDamping(undefined), false);
  });

  test('returns false when consecutive_failures below threshold', () => {
    const loopInfo = {
      consecutive_failures: limits.maxConsecutiveFailures - 1, // 2
      similar_calls_count: 0,
      loop_detected: false,
    };
    assert.equal(shouldApplyDamping(loopInfo), false);
  });

  test('returns true when consecutive_failures at threshold', () => {
    const loopInfo = {
      consecutive_failures: limits.maxConsecutiveFailures, // 3
      similar_calls_count: 0,
      loop_detected: false,
    };
    assert.equal(shouldApplyDamping(loopInfo), true);
  });

  test('returns true when consecutive_failures above threshold', () => {
    const loopInfo = {
      consecutive_failures: limits.maxConsecutiveFailures + 1, // 4
      similar_calls_count: 0,
      loop_detected: false,
    };
    assert.equal(shouldApplyDamping(loopInfo), true);
  });

  test('returns false when similar_calls_count below threshold', () => {
    const loopInfo = {
      consecutive_failures: 0,
      similar_calls_count: limits.maxRetries - 1, // 4
      loop_detected: false,
    };
    assert.equal(shouldApplyDamping(loopInfo), false);
  });

  test('returns true when similar_calls_count at threshold', () => {
    const loopInfo = {
      consecutive_failures: 0,
      similar_calls_count: limits.maxRetries, // 5
      loop_detected: false,
    };
    assert.equal(shouldApplyDamping(loopInfo), true);
  });

  test('returns true when loop_detected is true regardless of counts', () => {
    const loopInfo = {
      consecutive_failures: 0,
      similar_calls_count: 0,
      loop_detected: true,
    };
    assert.equal(shouldApplyDamping(loopInfo), true);
  });

  test('uses configured limits not hardcoded values', () => {
    // This test documents the expected thresholds
    assert.equal(limits.maxConsecutiveFailures, 3, 'maxConsecutiveFailures should be 3');
    assert.equal(limits.maxRetries, 5, 'maxRetries should be 5');

    // Verify behavior at boundary
    const atOldThreshold = { consecutive_failures: 2, similar_calls_count: 0, loop_detected: false };
    const atNewThreshold = { consecutive_failures: 3, similar_calls_count: 0, loop_detected: false };

    assert.equal(shouldApplyDamping(atOldThreshold), false, 'should NOT trigger at old hardcoded threshold of 2');
    assert.equal(shouldApplyDamping(atNewThreshold), true, 'should trigger at configured threshold of 3');
  });
});

// ============================================================
// History Stats Tests
// ============================================================

describe('getHistoryStats', () => {
  test('empty history returns correct structure', () => {
    const stats = getHistoryStats([]);

    assert.equal(stats.totalCalls, 0);
    assert.equal(stats.recentCalls, 0);
    assert.deepEqual(stats.toolCounts, {});
    assert.deepEqual(stats.failureCounts, {});
    assert.equal(stats.windowMs, limits.oscillationWindowMs);
  });

  test('counts total calls correctly', () => {
    const now = Date.now();
    const history = [
      { tool: 'Read', timestamp: now - 1000, failed: false },
      { tool: 'Write', timestamp: now - 2000, failed: false },
      { tool: 'Edit', timestamp: now - 3000, failed: false },
    ];

    const stats = getHistoryStats(history);
    assert.equal(stats.totalCalls, 3);
  });

  test('counts tool usage correctly', () => {
    const now = Date.now();
    const history = [
      { tool: 'Read', timestamp: now - 1000, failed: false },
      { tool: 'Read', timestamp: now - 2000, failed: false },
      { tool: 'Write', timestamp: now - 3000, failed: false },
    ];

    const stats = getHistoryStats(history);
    assert.equal(stats.toolCounts['Read'], 2);
    assert.equal(stats.toolCounts['Write'], 1);
  });

  test('counts failures correctly', () => {
    const now = Date.now();
    const history = [
      { tool: 'Edit', timestamp: now - 1000, failed: true },
      { tool: 'Edit', timestamp: now - 2000, failed: true },
      { tool: 'Edit', timestamp: now - 3000, failed: false },
    ];

    const stats = getHistoryStats(history);
    assert.equal(stats.toolCounts['Edit'], 3);
    assert.equal(stats.failureCounts['Edit'], 2);
  });

  test('filters entries outside time window', () => {
    const now = Date.now();
    const oldTimestamp = now - limits.oscillationWindowMs - 10000; // Outside window

    const history = [
      { tool: 'Read', timestamp: now - 1000, failed: false },      // Recent
      { tool: 'Read', timestamp: oldTimestamp, failed: true },     // Old - should not count
    ];

    const stats = getHistoryStats(history);
    assert.equal(stats.totalCalls, 2, 'totalCalls includes all entries');
    assert.equal(stats.recentCalls, 1, 'recentCalls only includes entries within window');
    assert.equal(stats.toolCounts['Read'], 1, 'toolCounts only counts recent entries');
    assert.equal(stats.failureCounts['Read'], undefined, 'old failure should not be counted');
  });

  test('handles mixed tools and failures', () => {
    const now = Date.now();
    const history = [
      { tool: 'Read', timestamp: now - 1000, failed: false },
      { tool: 'Write', timestamp: now - 2000, failed: true },
      { tool: 'Read', timestamp: now - 3000, failed: true },
      { tool: 'Bash', timestamp: now - 4000, failed: false },
    ];

    const stats = getHistoryStats(history);
    assert.equal(stats.totalCalls, 4);
    assert.equal(stats.recentCalls, 4);
    assert.equal(stats.toolCounts['Read'], 2);
    assert.equal(stats.toolCounts['Write'], 1);
    assert.equal(stats.toolCounts['Bash'], 1);
    assert.equal(stats.failureCounts['Read'], 1);
    assert.equal(stats.failureCounts['Write'], 1);
    assert.equal(stats.failureCounts['Bash'], undefined);
  });

  test('accepts history array directly (not sessionId)', () => {
    // This test documents the fix: getHistoryStats now accepts an array,
    // not a sessionId string. Passing an array should work correctly.
    const now = Date.now();
    const historyArray = [
      { tool: 'Edit', timestamp: now - 1000, failed: true },
      { tool: 'Edit', timestamp: now - 2000, failed: true },
    ];

    const stats = getHistoryStats(historyArray);

    // Should correctly count from the array
    assert.equal(stats.failureCounts['Edit'], 2);
    assert.equal(stats.toolCounts['Edit'], 2);
  });
});

// ============================================================
// Integration Tests (Error Vector Snapshots)
// ============================================================

describe('Integration Tests', () => {
  test('valid Write call produces empty error vector', () => {
    const toolName = 'Write';
    const toolInput = { file_path: '/test/file.txt', content: 'hello world' };

    const schemaResult = validateSchema(toolName, toolInput);
    const safetyResult = checkSafetyConstraints(toolName, toolInput);
    const malformedResult = detectMalformedInput(toolInput);

    assert.deepEqual(schemaResult.missing_fields, []);
    assert.deepEqual(schemaResult.invalid_values, []);
    assert.deepEqual(safetyResult, []);
    assert.deepEqual(malformedResult, []);
  });

  test('Write to .env produces forbidden action', () => {
    const toolName = 'Write';
    const toolInput = { file_path: '/app/.env', content: 'SECRET=123' };

    const safetyResult = checkSafetyConstraints(toolName, toolInput);
    assert.ok(safetyResult.length > 0);
  });

  test('missing content in Write produces missing field', () => {
    const toolName = 'Write';
    const toolInput = { file_path: '/test/file.txt' };

    const schemaResult = validateSchema(toolName, toolInput);
    assert.ok(schemaResult.missing_fields.includes('content'));
  });
});
