# lz-cybernetics.governor

A **cybernetic skill-verifier** plugin for Claude Code that validates and stabilizes all tool calls through a closed-loop feedback system.

## Overview

This plugin implements a cybernetics-inspired meta-controller that wraps all tool calls with:

1. **Observe** (PreToolUse hook) - Parse and validate tool calls before execution
2. **Compare** (Validator) - Check against schemas, safety rules, and invariants
3. **Correct** (PostToolUse hook) - Provide feedback, apply damping, track history

## Features

- Schema validation for all tool calls
- Detection of malformed or forbidden actions
- Oscillation/loop detection to prevent repeated failures
- Structured error vectors for self-correction
- Configurable safety constraints and retry limits

## Installation

```bash
claude /plugin install lz-cybernetics.governor@lz-cybernetics.governor-ai-plugins
```

Or for local development:

```bash
claude --plugin-dir /path/to/lz-cybernetics.governor
```

## How It Works

### The Cybernetic Loop

```
Claude --> PreToolUse (observe) --> Validator (compare) --> Tool Execution
                                                                 |
Claude <-- PostToolUse (correct) <-- Result Analysis <-----------+
```

The loop continues until:
- Output is valid
- System is stable
- Safety constraints are satisfied

### Error Vectors

When validation fails, the plugin produces structured error vectors:

```json
{
  "missing_fields": ["file_path"],
  "invalid_values": [{"field": "timeout", "expected": "number", "got": "string"}],
  "forbidden_actions": [],
  "loop_detected": false,
  "contradiction": null
}
```

This structured feedback helps Claude understand exactly what went wrong and how to fix it.

## Configuration

The plugin uses sensible defaults but can be customized via the shared modules:

- `hooks/shared/schema.mjs` - Tool schemas (required fields, types, defaults)
- `hooks/shared/invariants.mjs` - Global rules (allowed tools, retry limits, safety constraints)

## Components

| Component | Purpose |
|-----------|---------|
| `hooks/pre.mjs` | Observation layer - validates tool calls before execution |
| `hooks/post.mjs` | Correction layer - provides feedback after execution |
| `hooks/shared/schema.mjs` | Tool schema definitions |
| `hooks/shared/invariants.mjs` | Global safety rules and constraints |
| `hooks/shared/detectors.mjs` | Pattern detection (loops, contradictions) |
| `hooks/shared/controller.mjs` | Decision logic (reject, correct, escalate) |
| `hooks/shared/history.mjs` | Session state management |
| `skills/cybernetics/` | Educational skill about cybernetic patterns |
| `agents/cybernetics-diagnostician.md` | Diagnostic agent for troubleshooting |

## Debugging

Run Claude Code in debug mode to see hook execution:

```bash
claude --debug
```

Look for:
- Hook registration logs
- Validation results
- Error vectors produced

## License

MIT
