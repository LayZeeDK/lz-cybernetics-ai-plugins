# Error Vector Examples

This document shows common error vectors and how to interpret them.

## Missing Required Fields

**Error Vector:**
```json
{
  "missing_fields": ["file_path"],
  "invalid_values": [],
  "forbidden_actions": [],
  "loop_detected": false,
  "contradiction": null
}
```

**Cause:** The tool call is missing a required parameter.

**Fix:** Add the missing field to your tool call.

```javascript
// Wrong
{ content: "hello" }

// Correct
{ file_path: "/path/to/file.txt", content: "hello" }
```

---

## Type Mismatch

**Error Vector:**
```json
{
  "missing_fields": [],
  "invalid_values": [
    {"field": "timeout", "expected": "number", "got": "string"}
  ],
  "forbidden_actions": [],
  "loop_detected": false,
  "contradiction": null
}
```

**Cause:** A field has the wrong type.

**Fix:** Ensure the field value matches the expected type.

```javascript
// Wrong
{ command: "ls", timeout: "5000" }

// Correct
{ command: "ls", timeout: 5000 }
```

---

## Forbidden Action - Sensitive File

**Error Vector:**
```json
{
  "missing_fields": [],
  "invalid_values": [],
  "forbidden_actions": ["Sensitive file pattern detected: .env"],
  "loop_detected": false,
  "contradiction": null
}
```

**Cause:** Attempting to write to a sensitive file.

**Fix:** Use a different file path or confirm with the user first.

---

## Forbidden Action - Dangerous Command

**Error Vector:**
```json
{
  "missing_fields": [],
  "invalid_values": [],
  "forbidden_actions": ["Dangerous command pattern detected"],
  "loop_detected": false,
  "contradiction": null
}
```

**Cause:** The Bash command matches a dangerous pattern (e.g., `rm -rf /`).

**Fix:** Use a safer alternative or be more specific in your command.

---

## Loop Detection - Oscillation

**Error Vector:**
```json
{
  "missing_fields": [],
  "invalid_values": [],
  "forbidden_actions": [],
  "loop_detected": true,
  "contradiction": null
}
```

**Loop Info:**
```json
{
  "pattern": "Oscillation: Read <-> Write",
  "consecutive_failures": 0,
  "similar_calls_count": 4
}
```

**Cause:** The system detected an A-B-A-B pattern of alternating tool calls.

**Fix:**
1. Complete one operation fully before starting another
2. Consider if both operations are actually needed
3. Try a different approach entirely

---

## Loop Detection - Consecutive Failures

**Error Vector:**
```json
{
  "missing_fields": [],
  "invalid_values": [],
  "forbidden_actions": [],
  "loop_detected": true,
  "contradiction": null
}
```

**Loop Info:**
```json
{
  "pattern": "Consecutive failures: Edit (3 times)",
  "consecutive_failures": 3,
  "similar_calls_count": 3
}
```

**Cause:** The same tool has failed multiple times in a row.

**Fix:**
1. Check if the file exists and is accessible
2. Verify the old_string matches exactly (for Edit)
3. Try a different approach

---

## Contradiction

**Error Vector:**
```json
{
  "missing_fields": [],
  "invalid_values": [],
  "forbidden_actions": [],
  "loop_detected": false,
  "contradiction": "Plan indicates read-only operation but attempting Write"
}
```

**Cause:** The current action doesn't match the stated plan.

**Fix:**
1. Update your plan to reflect the actual intent
2. Or modify the action to match your plan

---

## Multiple Issues

**Error Vector:**
```json
{
  "missing_fields": ["content"],
  "invalid_values": [
    {"field": "file_path", "expected": "string", "got": "number"}
  ],
  "forbidden_actions": [],
  "loop_detected": false,
  "contradiction": null
}
```

**Cause:** Multiple validation failures in one call.

**Fix:** Address all issues:
1. Add the missing `content` field
2. Change `file_path` from number to string

---

## Clean Pass

**Error Vector:**
```json
{
  "missing_fields": [],
  "invalid_values": [],
  "forbidden_actions": [],
  "loop_detected": false,
  "contradiction": null
}
```

**Meaning:** The tool call passed all validation checks.

The cybernetic loop is stable - proceed with execution.
