---
name: governor
description: >
  Claude uses this skill when users ask about cybernetic feedback loops,
  the lz-cybernetics.governor plugin, tool validation patterns, error vectors,
  oscillation detection, or how to configure the cybernetic verifier.
  Trigger phrases include "cybernetic loop", "feedback control", "error vector",
  "oscillation detection", "validation failed", "tool verification", and
  "configure cybernetics".
version: 1.0.0
---

# Governor Skill

Guide for understanding and configuring the lz-cybernetics.governor plugin, which implements a cybernetic feedback loop for tool call validation.

## The Cybernetic Model

The plugin implements a closed-loop control system inspired by cybernetics theory:

```
+--------+    +-------------+    +------+    +--------------+    +--------+
| Claude |--->| PreToolUse  |--->| Tool |--->| PostToolUse  |--->| Claude |
+--------+    | (Observe)   |    +------+    | (Correct)    |    +--------+
              +------+------+        |       +-------+------+
                     |               |               |
                     v               v               |
              +------+---------------+---------------+
              |           Validator (Compare)        |
              +--------------------------------------+
```

**Flow:** Claude proposes a tool call -> PreToolUse observes and validates -> Tool executes -> PostToolUse analyzes results -> Feedback returns to Claude

### Three Phases

1. **Observe** (PreToolUse hook)
   - Parse tool call JSON
   - Extract parameters and context
   - Build observation packet

2. **Compare** (Validator modules)
   - Check against tool schemas
   - Verify safety constraints
   - Detect forbidden actions
   - Identify oscillation patterns

3. **Correct** (PostToolUse hook)
   - Analyze execution results
   - Update session history
   - Apply damping if needed
   - Provide structured feedback

## Error Vectors

When validation fails, the system produces a structured error vector:

```json
{
  "missing_fields": ["file_path"],
  "invalid_values": [{"field": "timeout", "expected": "number", "got": "string"}],
  "forbidden_actions": ["Sensitive file pattern detected"],
  "loop_detected": true,
  "contradiction": "Plan mentions read-only but attempting Write"
}
```

Use this structure to understand exactly what failed and how to fix it.

## Configuration

### Tool Schemas

Edit `hooks/shared/schema.mjs` to customize validation rules:

```javascript
export const toolSchemas = {
  CustomTool: {
    required: ['param1', 'param2'],
    types: {
      param1: 'string',
      param2: 'number',
    },
    defaults: {
      param2: 100,
    },
    forbidden: ['dangerousParam'],
  },
};
```

### Safety Constraints

Edit `hooks/shared/invariants.mjs` to add safety rules:

```javascript
export const safetyConstraints = {
  Write: {
    sensitivePatterns: [
      /\.env$/i,
      /credentials/i,
      /your-custom-pattern/i,
    ],
  },
};
```

### Oscillation Limits

Adjust loop detection thresholds in `hooks/shared/invariants.mjs`:

```javascript
export const limits = {
  maxConsecutiveFailures: 3,  // Failures before escalation
  maxRetries: 5,               // Same operation retries
  oscillationWindowMs: 30000,  // Time window for detection
};
```

## Troubleshooting

**Enable debug logging:** Use `/lz-cybernetics.governor:debug on` to see detailed hook validation output in `claude --debug` mode. This helps diagnose all issues below.

### Validation Keeps Failing

1. Check the error vector in the systemMessage
2. Verify all required fields are provided
3. Ensure field types match schema expectations
4. Check for forbidden patterns in your input

### Oscillation Detected

The system detected a repeated failure pattern. To break the cycle:

1. Step back and reconsider your approach
2. Try a fundamentally different strategy
3. Ask the user for clarification
4. Check if prerequisites are met

### Hook Not Running

1. Verify plugin is installed: `/plugins`
2. Check hooks.json syntax is valid
3. Restart Claude Code to reload hooks
4. Enable debug logging: `/lz-cybernetics.governor:debug on`
5. Run with `claude --debug` to see hook logs and validation details

## Reference Files

For detailed examples, see:
- `examples/error-vectors.md` - Sample error vectors and interpretations
- `examples/custom-config.md` - Configuration customization examples

## Further Reading

- Norbert Wiener, "Cybernetics" (1948) - foundational text
- Control theory: feedback loops, stability, damping
- Claude Code hooks documentation
