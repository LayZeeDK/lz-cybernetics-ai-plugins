# Custom Configuration Examples

This document shows how to customize the cybernetic verifier.

## Adding a Custom Tool Schema

To add validation for a custom or MCP tool, edit `hooks/shared/schema.mjs`:

```javascript
export const toolSchemas = {
  // ... existing schemas ...

  // Custom tool schema
  mcp__myserver__create_item: {
    required: ['name', 'type'],
    types: {
      name: 'string',
      type: 'string',
      description: 'string',
      priority: 'number',
      tags: 'array',
    },
    defaults: {
      priority: 1,
    },
    forbidden: ['internal_id'],  // Don't allow setting internal ID
  },
};
```

---

## Adding Safety Constraints

To add custom safety rules, edit `hooks/shared/invariants.mjs`:

```javascript
export const safetyConstraints = {
  // ... existing constraints ...

  // Custom constraints for your workflow
  Write: {
    sensitivePatterns: [
      /\.env$/i,
      /credentials/i,
      /secrets?\./i,
      // Add your patterns
      /production\.config/i,
      /api[-_]?keys?/i,
    ],
  },

  // Bash command restrictions
  Bash: {
    dangerousPatterns: [
      /rm\s+-rf\s+[\/~]/i,
      // Add your patterns
      /DROP\s+DATABASE/i,
      /TRUNCATE\s+TABLE/i,
      /--force\s+push/i,
    ],
  },
};
```

---

## Adjusting Oscillation Detection

To change how quickly the system detects loops, edit the limits in `hooks/shared/invariants.mjs`:

```javascript
export const limits = {
  // More tolerant (allow more retries)
  maxConsecutiveFailures: 5,  // Default: 3
  maxRetries: 10,             // Default: 5

  // Longer detection window
  oscillationWindowMs: 60000, // Default: 30000 (30s)

  // Shorter history
  maxHistorySize: 50,         // Default: 100
};
```

### Stricter Settings (for critical operations)

```javascript
export const limits = {
  maxConsecutiveFailures: 2,   // Quick escalation
  maxRetries: 3,               // Fewer retries
  oscillationWindowMs: 15000,  // Shorter window
  maxHistorySize: 100,
};
```

### More Permissive Settings (for exploration)

```javascript
export const limits = {
  maxConsecutiveFailures: 5,
  maxRetries: 10,
  oscillationWindowMs: 60000,  // 1 minute
  maxHistorySize: 200,
};
```

---

## Adding Custom Detectors

To add custom detection logic, edit `hooks/shared/detectors.mjs`:

```javascript
/**
 * Detect if a file operation might cause data loss
 * @param {string} toolName - Tool name
 * @param {object} toolInput - Tool input
 * @returns {string|null} Warning message or null
 */
export function detectDataLossRisk(toolName, toolInput) {
  if (toolName === 'Write' && toolInput.file_path) {
    // Check if overwriting without backup
    const dangerousPaths = [
      /\/src\//,
      /\/config\//,
      /package\.json$/,
    ];

    for (const pattern of dangerousPaths) {
      if (pattern.test(toolInput.file_path)) {
        return `Overwriting important file: ${toolInput.file_path}`;
      }
    }
  }
  return null;
}
```

Then use it in `hooks/pre.mjs`:

```javascript
import { detectDataLossRisk } from './shared/detectors.mjs';

// In main():
const dataLossWarning = detectDataLossRisk(toolName, toolInput);
if (dataLossWarning) {
  errorVector.forbidden_actions.push(dataLossWarning);
}
```

---

## Disabling Specific Checks

To disable certain validations, you can modify the pre-hook:

```javascript
// In hooks/pre.mjs

// Skip validation for specific tools
const SKIP_VALIDATION = new Set(['Read', 'Glob', 'Grep']);

async function main() {
  const input = await readInput();
  const toolName = input.tool_name;

  // Skip for read-only tools
  if (SKIP_VALIDATION.has(toolName)) {
    console.log(JSON.stringify({
      hookSpecificOutput: { permissionDecision: 'allow' }
    }));
    process.exit(0);
  }

  // ... rest of validation
}
```

---

## Environment-Based Configuration

Load different settings based on environment:

```javascript
// hooks/shared/config.mjs
const isProduction = process.env.NODE_ENV === 'production';

export const limits = {
  maxConsecutiveFailures: isProduction ? 2 : 5,
  maxRetries: isProduction ? 3 : 10,
  oscillationWindowMs: isProduction ? 15000 : 60000,
};
```

---

## Logging for Debugging

Add logging to understand what's happening:

```javascript
// In hooks/pre.mjs
function debug(...args) {
  if (process.env.LZ_CYBERNETICS_DEBUG) {
    console.error('[DEBUG]', ...args);
  }
}

async function main() {
  const input = await readInput();
  debug('Input:', JSON.stringify(input, null, 2));

  // ... validation logic

  debug('Error vector:', JSON.stringify(errorVector, null, 2));
  debug('Decision:', decision.action);
}
```

Run with: `LZ_CYBERNETICS_DEBUG=1 claude`
