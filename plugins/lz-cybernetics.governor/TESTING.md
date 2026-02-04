# Testing Guide for lz-cybernetics.governor

This document provides a comprehensive testing plan for the lz-cybernetics.governor plugin on Windows with PowerShell.

## Prerequisites

- Node.js LTS installed
- Claude Code CLI installed
- Plugin files in place

## Quick Validation

Run the unit tests using Node.js built-in test runner:

**From repository root (recommended):**

```bash
# macOS/Linux/Git Bash
node --test --watch plugins/lz-cybernetics.governor/tests/verifier.test.mjs

# PowerShell
node --test --watch plugins\lz-cybernetics.governor\tests\verifier.test.mjs
```

**From plugin directory:**

```bash
# macOS/Linux/Git Bash
cd plugins/lz-cybernetics.governor
node --test --watch tests/verifier.test.mjs

# PowerShell
Set-Location plugins\lz-cybernetics.governor
node --test --watch tests\verifier.test.mjs
```

The `--watch` flag re-runs tests automatically when files change. Omit it for a single run.

Expected: All 34 tests pass with hierarchical output showing test suites and individual test results.

### Additional Test Runner Options

```bash
# Run specific test by name pattern
node --test --test-name-pattern="validateSchema" tests/verifier.test.mjs

# Combine watch with filter
node --test --watch --test-name-pattern="detectLoop" tests/verifier.test.mjs
```

## Installation for Testing

There are two testing scenarios with different behaviors:

### Scenario A: Testing in the Plugin Repository (Development)

When testing from within the `lz-cybernetics.governor-ai-plugins` repository, Claude can see the plugin source files. This is useful for development but affects skill behavior:

- **Hooks:** Work normally (PreToolUse/PostToolUse validation runs)
- **Skill:** Claude may choose to explore the source code directly instead of using the skill, since the implementation files are visible
- **Agent:** Works normally

```powershell
# From repository root
claude --plugin-dir plugins\lz-cybernetics.governor
```

**Use this for:** Hook development, debugging, unit testing.

### Scenario B: Testing in Another Project (End-User Experience)

When testing in a separate project, Claude cannot see the plugin internals. This simulates the real end-user experience:

- **Hooks:** Work normally
- **Skill:** Claude relies on the skill content since source files are not visible
- **Agent:** Works normally

```powershell
# Copy plugin to target project
New-Item -ItemType Directory -Force -Path "C:\path\to\project\.claude-plugins"
Copy-Item -Recurse plugins\lz-cybernetics.governor "C:\path\to\project\.claude-plugins\"

# Start Claude in the target project
Set-Location "C:\path\to\project"
claude
```

**Use this for:** Testing skill activation, validating end-user experience, integration testing.

### Quick Setup for Scenario B Testing

For quick testing in another project without copying files:

```powershell
# Navigate to any project directory
Set-Location "C:\path\to\other\project"

# Load plugin from absolute path
claude --plugin-dir "D:\projects\github\LayZeeDK\lz-cybernetics.governor-ai-plugins\plugins\lz-cybernetics.governor"
```

**Note:** Replace the path with your actual repository location.

## Verification Checklist

### 1. Plugin Loads Correctly

**Command:** `/plugins`

**Expected:** See `lz-cybernetics.governor` in the list of installed plugins.

**If not visible:**
- Check plugin.json syntax:
  ```powershell
  Get-Content .claude-plugin\plugin.json | ConvertFrom-Json | ConvertTo-Json -Depth 10
  ```
- Verify directory structure matches expected layout
- Restart Claude Code

### 2. Hooks Are Registered

**Command:** Start Claude with debug mode

```powershell
claude --debug
```

**Expected:** Look for in the output:
- Hook registration for PreToolUse
- Hook registration for PostToolUse

**If not registered:**
- Validate hooks.json:
  ```powershell
  Get-Content hooks\hooks.json | ConvertFrom-Json | ConvertTo-Json -Depth 10
  ```
- Check for syntax errors in hook scripts
- Verify `${CLAUDE_PLUGIN_ROOT}` is used (not hardcoded paths)

### 3. Skill Is Available

**Important:** Test this in **Scenario B** (another project) for accurate results. When testing in the plugin repository (Scenario A), Claude can see the source files and may choose to explore them directly instead of using the skill.

**Test:** Ask Claude:
> "How does the cybernetic feedback loop work?"

or

> "What is an error vector?"

**Expected behavior by scenario:**

| Scenario | Expected Behavior |
|----------|-------------------|
| **A (Plugin Repo)** | Claude may explore source files OR use the skill |
| **B (Other Project)** | Claude should use the skill (source not visible) |

**Trigger phrases that may activate the skill:**
- "cybernetic loop"
- "feedback control"
- "error vector"
- "oscillation detection"
- "tool verification"
- "configure cybernetics"

**Why skill activation varies:**

Skills with trigger phrases are *suggestions* to Claude, not guaranteed activations. Claude evaluates:
1. Whether relevant source code is visible in the current project
2. Whether the skill content would better answer the question
3. The specificity of the user's request

**If Claude doesn't activate the skill (especially in Scenario B):**

1. **Be more explicit:** "Use the lz-cybernetics.governor skill to explain the cybernetic feedback loop"
2. **Reference the skill by name:** "According to the lz-cybernetics.governor skill, how does error vector correction work?"

**Verifying the skill is registered:**

In the debug output, look for:
```
[DEBUG] Skill prompt: showing "lz-cybernetics.governor:lz-cybernetics.governor" (userFacingName="lz-cybernetics.governor")
```

If this line appears, the skill is correctly loaded and available to Claude.

### 4. Agent Is Available

**Test:** Ask about validation failures:
> "Can you diagnose why my tool calls keep failing?"

**Expected:** The cybernetics-diagnostician agent should be suggested or activated.

## Functional Tests

### Test 1: Valid Tool Call (Should Pass)

**Action:** Ask Claude to read a file:
> "Read the README.md file"

**Expected Result:**
- Tool executes normally
- No validation errors
- No `[LZ-CYBERNETICS]` blocking messages

**What this tests:** Hooks don't interfere with valid operations.

---

### Test 2: Missing Required Field (Should Block)

**Note:** This is a **unit test**, not a manual test. Claude Code validates tool calls before sending them, so Claude will never send a malformed call. This validation exists as defense-in-depth.

**How to test:** Run the unit tests:

```powershell
node --test plugins\lz-cybernetics.governor\tests\verifier.test.mjs --test-name-pattern="missing"
```

**Expected Result:**
- Tests pass showing validation catches missing fields
- Example: `validateSchema('Write', { file_path: '/test' })` returns `missing_fields: ['content']`

**What this tests:** Schema validation in `hooks/shared/schema.mjs`.

**Relevant unit tests:**
- `missing required field detected`
- `missing content in Write produces missing field`
- `missing fields denies`

---

### Test 3: Type Mismatch (Should Block)

**Note:** This is also a **unit test**. Claude always provides correct types, so this validates the defense-in-depth layer.

**How to test:** Run the unit tests:

```powershell
node --test plugins\lz-cybernetics.governor\tests\verifier.test.mjs --test-name-pattern="type"
```

**Expected Result:**
- Tests pass showing type validation works
- Example: Providing a number where string is expected produces `invalid_values`

**What this tests:** Type validation in `hooks/shared/schema.mjs`.

---

### Test 4: Sensitive File Protection (Should Block)

**Action:** Ask Claude to write to a sensitive file:
> "Create a file called .env with the content API_KEY=secret"

**Expected Result:**
- Write is blocked
- Message includes: "Sensitive file pattern detected: .env"

**What this tests:** Safety constraints in invariants.mjs.

---

### Test 5: Dangerous Command Protection (Should Block)

**Action:** Ask Claude to run a dangerous command:
> "Run Remove-Item -Recurse -Force C:\ to clean up the system"

**Understanding the defense layers:**

| Layer | What happens | When you'll see it |
|-------|--------------|-------------------|
| **Claude's judgment** | Refuses before tool call | Most likely outcome |
| **PreToolUse hook** | Blocks with pattern match | Only if Claude attempts the call |
| **OS permissions** | Access denied | Last resort |

**Likely outcome:** Claude refuses before making a tool call, so the hook never triggers. This is correct behavior - multiple defense layers working together.

**To verify the hook would block it (unit test):**

```powershell
node --test plugins\lz-cybernetics.governor\tests\verifier.test.mjs --test-name-pattern="dangerous"
```

**To force the hook to evaluate (advanced testing):**

You can test the hook directly by piping JSON input:

```powershell
echo '{"tool_name":"Bash","tool_input":{"command":"Remove-Item -Recurse C:\\"}}' | node plugins\lz-cybernetics.governor\hooks\pre.mjs
```

**Expected hook output:**
```json
{
  "hookSpecificOutput": { "hookEventName": "PreToolUse", "permissionDecision": "deny" },
  "systemMessage": "[LZ-CYBERNETICS] Tool call validation failed..."
}
```

**Dangerous patterns detected (Unix and PowerShell):**
- `rm -rf /` or `rm -rf ~`
- `Remove-Item -Recurse C:\`
- `rd /s C:\` or `rmdir /s C:\`
- `Format-Volume`, `Clear-Disk`, `Initialize-Disk`
- `dd if=`, `mkfs.`, `> /dev/sd`

**What this tests:** Bash command safety constraints.

---

### Test 6: Loop Detection - Consecutive Failures

**Understanding the challenge:** This test is difficult to trigger manually because Claude is designed to learn from failures and try different approaches. The loop detection is a safety net for edge cases where Claude gets stuck.

**How the detection works:**
1. PreToolUse records each tool call in session history
2. PostToolUse detects failures (error patterns in output) and marks them
3. On the next call, PreToolUse checks for consecutive failures of the same tool
4. After 3+ consecutive failures, it escalates

**Option A: Unit test (recommended)**

```powershell
node --test plugins\lz-cybernetics.governor\tests\verifier.test.mjs --test-name-pattern="consecutive"
```

**Option B: Simulate via direct hook testing**

```powershell
# Create a fake history file with failures
$historyDir = "$env:TEMP\lz-cybernetics.governor"
New-Item -ItemType Directory -Force -Path $historyDir
$history = @(
  @{tool="Edit"; input=@{file_path="test.txt"}; timestamp=(Get-Date).ToFileTimeUtc(); failed=$true; failureReason="not found"},
  @{tool="Edit"; input=@{file_path="test.txt"}; timestamp=(Get-Date).ToFileTimeUtc(); failed=$true; failureReason="not found"},
  @{tool="Edit"; input=@{file_path="test.txt"}; timestamp=(Get-Date).ToFileTimeUtc(); failed=$true; failureReason="not found"}
) | ConvertTo-Json -Depth 3
$history | Out-File "$historyDir\history-test-session.json" -Encoding UTF8

# Now test the hook with that session
echo '{"tool_name":"Edit","tool_input":{"file_path":"test.txt","old_string":"x","new_string":"y"},"session_id":"test-session"}' | node plugins\lz-cybernetics.governor\hooks\pre.mjs
```

**Expected output:**
```json
{
  "hookSpecificOutput": { "hookEventName": "PreToolUse", "permissionDecision": "deny" },
  "systemMessage": "[LZ-CYBERNETICS] Oscillation/loop pattern detected...\nConsecutive failures: Edit (3 times)"
}
```

**Option C: Force Claude into a loop (advanced)**

Claude will typically adapt and succeed, so you need to create an **impossible** scenario:

```powershell
# Create a read-only file that Edit cannot modify
"test content" | Out-File test-readonly.txt
Set-ItemProperty test-readonly.txt -Name IsReadOnly -Value $true
```

Then ask Claude with constraints that prevent adaptation:
> "Edit test-readonly.txt and replace 'test' with 'changed'. Use only the Edit tool - do not try other approaches or suggest making the file writable."

After 3+ failures, the loop detection should trigger.

**Cleanup:**
```powershell
Set-ItemProperty test-readonly.txt -Name IsReadOnly -Value $false
Remove-Item test-readonly.txt
```

See `tests/manual/force-loop-test.md` for detailed instructions.

**Note:** In normal operation, Claude would recognize the permission error and suggest solutions. The loop detection catches edge cases where Claude's intelligence can't solve the problem.

**What this tests:** Loop detection in `hooks/shared/detectors.mjs`.

---

### Test 7: Loop Detection - Oscillation Pattern

**What it detects:** When Claude alternates between two tools in a pattern like Read→Write→Read→Write, this may indicate indecision or a stuck loop.

**Option A: Unit test (recommended)**

```powershell
node --test plugins\lz-cybernetics.governor\tests\verifier.test.mjs --test-name-pattern="oscillation"
```

**Option B: Simulate via history file**

```powershell
$historyDir = "$env:TEMP\lz-cybernetics.governor"
New-Item -ItemType Directory -Force -Path $historyDir
$now = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
$history = @(
  @{tool="Read"; input=@{}; timestamp=$now-4000; failed=$false},
  @{tool="Write"; input=@{}; timestamp=$now-3000; failed=$false},
  @{tool="Read"; input=@{}; timestamp=$now-2000; failed=$false},
  @{tool="Write"; input=@{}; timestamp=$now-1000; failed=$false}
) | ConvertTo-Json -Depth 3
$history | Out-File "$historyDir\history-oscillation-test.json" -Encoding UTF8

# Test the hook
echo '{"tool_name":"Read","tool_input":{},"session_id":"oscillation-test"}' | node plugins\lz-cybernetics.governor\hooks\pre.mjs
```

**Expected output:**
```json
{
  "hookSpecificOutput": { "hookEventName": "PreToolUse", "permissionDecision": "deny" },
  "systemMessage": "[LZ-CYBERNETICS] Oscillation/loop pattern detected...\nOscillation: Read <-> Write"
}
```

**Option C: Manual trigger (difficult)**

**Setup - create test files:**
```powershell
# Create a file with content to summarize
@"
Chapter 1: Introduction
This document covers the basics of testing.

Chapter 2: Methods
We use unit tests and integration tests.

Chapter 3: Conclusion
Testing improves software quality.
"@ | Out-File -FilePath oscillation-test.txt -Encoding UTF8

# Create an empty summary file
"" | Out-File -FilePath oscillation-summary.txt -Encoding UTF8
```

**Test prompt:**
> "Read oscillation-test.txt, write a one-line summary to oscillation-summary.txt, then read oscillation-test.txt again to verify your summary is accurate, then update oscillation-summary.txt if needed. Keep alternating between reading and writing at least 5 times."

**Cleanup:**
```powershell
Remove-Item oscillation-test.txt, oscillation-summary.txt -ErrorAction SilentlyContinue
```

**Note:** Claude typically completes tasks efficiently without oscillating. This test is difficult to trigger because Claude recognizes when alternation is unnecessary.

**What this tests:** Oscillation detection in `hooks/shared/detectors.mjs`.

---

### Test 8: History Tracking

**Action:** After running several tool calls, check the history file.

**Command:**
```powershell
# List history files
Get-ChildItem "$env:TEMP\lz-cybernetics.governor\" -ErrorAction SilentlyContinue

# View history content
Get-ChildItem "$env:TEMP\lz-cybernetics.governor\history-*.json" | ForEach-Object {
    Write-Host "File: $($_.Name)"
    Get-Content $_.FullName | ConvertFrom-Json | ConvertTo-Json -Depth 5
}
```

**Expected Result:**
- History file exists
- Contains JSON array of recent tool calls
- Each entry has: tool, input (summarized), timestamp, failed status

**What this tests:** History management in history.mjs.

---

### Test 9: PostToolUse Feedback

**What it tests:** The PostToolUse hook inspects tool output and detects error patterns like:
- `error:`, `failed:`, `exception:`
- `not found`, `no such file`, `ENOENT`
- `permission denied`, `EPERM`, `EACCES`
- `operation not permitted`

When errors are detected, the hook:
1. Marks the history entry as failed
2. Provides feedback to Claude
3. If repeated failures occur, escalates with damping

**Option A: Direct hook testing (recommended)**

Test the PostToolUse hook by simulating a tool result with error patterns:

```powershell
# Simulate a tool result containing an error pattern
$input = @{
  tool_name = "Bash"
  tool_input = @{ command = "some-command" }
  tool_result = "error: command not found"
  session_id = "test-post-feedback"
} | ConvertTo-Json

$input | node plugins\lz-cybernetics.governor\hooks\post.mjs
```

**Expected output:**
```json
{
  "systemMessage": "[LZ-CYBERNETICS] Tool execution feedback.\n\nISSUE: Error pattern detected in output"
}
```

**Option B: Test feedback with warning (2 failures in history)**

```powershell
# Create a history with TWO previous failures (triggers warning, not damping)
$historyDir = "$env:TEMP\lz-cybernetics.governor"
New-Item -ItemType Directory -Force -Path $historyDir
$now = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
$history = @(
  @{tool="Bash"; input=@{command="test"}; timestamp=$now-3000; failed=$true; failureReason="Error pattern detected"},
  @{tool="Bash"; input=@{command="test"}; timestamp=$now-2000; failed=$true; failureReason="Error pattern detected"}
) | ConvertTo-Json -Depth 3
$history | Out-File "$historyDir\history-feedback-test.json" -Encoding UTF8

# Simulate another failure (3rd failure = warning, not damping yet)
$input = @{
  tool_name = "Bash"
  tool_input = @{ command = "test" }
  tool_result = "error: still failing"
  session_id = "feedback-test"
} | ConvertTo-Json

$input | node plugins\lz-cybernetics.governor\hooks\post.mjs
```

**Expected output (feedback with warning):**
```json
{
  "systemMessage": "[LZ-CYBERNETICS] Tool execution feedback.\n\nISSUE: Error pattern detected in output\n\nWARNING: Bash has failed 3 times recently.\n\nConsider:\n1. Checking if the inputs are correct\n2. Verifying prerequisites are met\n3. Trying an alternative approach"
}
```

**Option B2: Test damping escalation (3+ failures in history)**

```powershell
# Create a history with THREE previous failures (triggers damping)
$historyDir = "$env:TEMP\lz-cybernetics.governor"
New-Item -ItemType Directory -Force -Path $historyDir
$now = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
$history = @(
  @{tool="Bash"; input=@{command="test"}; timestamp=$now-4000; failed=$true; failureReason="Error pattern detected"},
  @{tool="Bash"; input=@{command="test"}; timestamp=$now-3000; failed=$true; failureReason="Error pattern detected"},
  @{tool="Bash"; input=@{command="test"}; timestamp=$now-2000; failed=$true; failureReason="Error pattern detected"}
) | ConvertTo-Json -Depth 3
$history | Out-File "$historyDir\history-damping-test.json" -Encoding UTF8

# Simulate a 4th failure (triggers damping)
$input = @{
  tool_name = "Bash"
  tool_input = @{ command = "test" }
  tool_result = "error: still failing"
  session_id = "damping-test"
} | ConvertTo-Json

$input | node plugins\lz-cybernetics.governor\hooks\post.mjs
```

**Expected output (damping applied):**
```json
{
  "systemMessage": "[LZ-CYBERNETICS] Damping applied due to repeated issues.\n\nPattern: Multiple failures detected\nConsecutive failures: 3\n\nRecommendation: Take a different approach before retrying.\n\nHistory stats:\n  - Recent calls: 3\n  - Total this session: 3"
}
```

**Understanding the response hierarchy:**

| Failures in History | Response Type | Message Prefix |
|---------------------|---------------|----------------|
| 0-1 | Simple feedback | "Tool execution feedback" + "ISSUE: ..." |
| 2 | Feedback with warning | "Tool execution feedback" + "WARNING: X has failed N times" |
| 3+ | Damping | "Damping applied due to repeated issues" |

**Note:** Thresholds are configured in `hooks/shared/invariants.mjs` (`maxConsecutiveFailures: 3`).

**Option C: Manual trigger with Claude**

Ask Claude to run a command that produces error-like output:
> "Run the command `node -e \"console.log('error: simulated failure for testing')\"` using Bash"

**Expected behavior:**
1. The command executes successfully (exit code 0)
2. PostToolUse hook detects "error:" in the output
3. In debug mode (`claude --debug`), you'll see the feedback being generated

**Note:** The command itself succeeds, but the *output text* contains error patterns that the hook detects. This tests the hook's ability to identify problems from tool output content.

**Cleanup (for Options B/B2):**
```powershell
Remove-Item "$env:TEMP\lz-cybernetics.governor\history-feedback-test.json" -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\lz-cybernetics.governor\history-damping-test.json" -ErrorAction SilentlyContinue
```

**What this tests:** Error detection and feedback generation in `hooks/post.mjs`.

---

### Test 10: Unknown/Hallucinated Tool (Should Block)

**What it detects:** The PreToolUse hook validates that tool names are real. It catches:
- Null or undefined tool names
- Non-string tool names
- Unknown tool names (not in the allowed list)
- Malformed MCP tool names (must have format `mcp__server__tool`)

**Why this matters:** In rare cases, LLMs can "hallucinate" tool names that don't exist. This validation catches such cases before they cause cryptic errors.

**Option A: Unit test (recommended)**

```powershell
node --test plugins\lz-cybernetics.governor\tests\verifier.test.mjs --test-name-pattern="hallucinated"
```

**Expected output:**
```
✔ null tool is hallucinated
✔ valid tools not hallucinated
✔ invalid MCP format is hallucinated
```

**Option B: Direct hook testing**

```powershell
# Test with a completely fake tool name
$input = @{
  tool_name = "FakeToolThatDoesNotExist"
  tool_input = @{}
  session_id = "test-hallucination"
} | ConvertTo-Json

$input | node plugins\lz-cybernetics.governor\hooks\pre.mjs
```

**Expected output:**
```json
{
  "hookSpecificOutput": { "hookEventName": "PreToolUse", "permissionDecision": "deny" },
  "systemMessage": "[LZ-CYBERNETICS] Tool call validation failed.\n\nFORBIDDEN ACTION DETECTED:\n  - Unknown tool: FakeToolThatDoesNotExist\n\nThis action violates safety constraints. Please use a different approach."
}
```

**Option B2: Test malformed MCP tool**

```powershell
# MCP tools must have format: mcp__server__tool (3 parts)
$input = @{
  tool_name = "mcp__invalid"
  tool_input = @{}
  session_id = "test-mcp"
} | ConvertTo-Json

$input | node plugins\lz-cybernetics.governor\hooks\pre.mjs
```

**Expected output:** Same denial message for invalid MCP format.

**Option C: Manual trigger (not possible)**

Claude Code validates tool names internally before sending them to hooks, so you cannot manually trigger this scenario through normal Claude interaction. This validation is defense-in-depth for edge cases.

**What this tests:** Hallucination detection in `hooks/shared/detectors.mjs`.

## Debug Logging

To enable detailed logging for troubleshooting:

**Option A: Use the debug command (recommended)**

```bash
# Enable debug logging
/lz-cybernetics.governor:debug on

# Check status
/lz-cybernetics.governor:debug status

# Disable debug logging
/lz-cybernetics.governor:debug off
```

Then start or restart Claude with debug mode to see hook debug output:

```powershell
claude --debug
```

The debug command creates a flag file that the hooks check at startup. Debug info is included in the JSON output, which appears in Claude's debug log (e.g., `~/.claude/debug/*.txt`).

**Option B: Manual file-based flag (for testing without Claude)**

```powershell
# Create the debug flag file manually
New-Item -ItemType File -Force -Path "$env:TEMP\lz-cybernetics.governor\debug-enabled"

# To disable
Remove-Item "$env:TEMP\lz-cybernetics.governor\debug-enabled" -ErrorAction SilentlyContinue
```

**Option C: Environment variable (for direct hook testing)**

```powershell
# Set environment variable
$env:LZ_CYBERNETICS_DEBUG = "1"

# Test hooks directly
$input = '{"tool_name":"Read","tool_input":{"file_path":"test.txt"}}'
$input | node plugins\lz-cybernetics.governor\hooks\pre.mjs
```

Note: Environment variables may not be inherited when Claude runs hooks as subprocesses.
Use Option A (the debug command) for debugging during Claude sessions.

**Debug output includes:**
- `pre.mjs`: toolName, errorVector, loopInfo, decision
- `post.mjs`: toolName, hookEvent, failureInfo, loopInfo, dampingApplied

**To clear (Option C):**

```powershell
Remove-Item Env:\LZ_CYBERNETICS_DEBUG -ErrorAction SilentlyContinue
```

## Troubleshooting

### Hooks Not Running

1. **Check plugin is loaded:** `/plugins`
2. **Validate hooks.json syntax:**
   ```powershell
   node -e "console.log(JSON.parse(require('fs').readFileSync('hooks\hooks.json')))"
   ```
3. **Check hook script syntax:**
   ```powershell
   node --check hooks\pre.mjs
   node --check hooks\post.mjs
   ```
4. **Restart Claude Code** - hooks load at session start

### Hook Output Validation Errors

If you see errors like `Hook JSON output validation failed` in debug output:

**Common cause:** Missing `hookEventName` field in `hookSpecificOutput`.

The Claude Code hook API requires a discriminator field:

```javascript
// WRONG - will fail validation
output.hookSpecificOutput = {
  permissionDecision: 'allow',
};

// CORRECT - includes hookEventName
output.hookSpecificOutput = {
  hookEventName: 'PreToolUse',  // or 'PostToolUse'
  permissionDecision: 'allow',
};
```

**Valid hookEventName values:**
- `'PreToolUse'` for PreToolUse hooks
- `'PostToolUse'` for PostToolUse hooks

**Note:** If a hook outputs `{}` (empty object) without `hookSpecificOutput`, no `hookEventName` is needed.

### Validation Too Strict

If legitimate operations are being blocked:

1. Check `hooks\shared\invariants.mjs` for safety patterns
2. Adjust `sensitivePatterns` or `dangerousPatterns` as needed
3. Modify `limits` for more tolerance

### Validation Too Permissive

If dangerous operations are allowed:

1. Add patterns to `safetyConstraints` in invariants.mjs
2. Add required fields to schemas in schema.mjs
3. Reduce `limits.maxConsecutiveFailures` for earlier detection

### History File Issues

If history isn't being tracked:

1. Check temp directory exists and is writable:
   ```powershell
   Test-Path $env:TEMP
   New-Item -ItemType Directory -Force -Path "$env:TEMP\lz-cybernetics.governor"
   ```
2. Verify session_id is being passed to hooks
3. Check for JSON parsing errors in history file

## Performance Considerations

- Hooks run synchronously before/after each tool call
- Current timeout: 10 seconds per hook
- History file grows but is capped at 100 entries
- If hooks are slow, consider:
  - Reducing validation complexity
  - Skipping validation for read-only tools (customize in pre.mjs)

## Reporting Issues

When reporting issues, include:

1. Claude Code version
2. Node.js version: `node --version`
3. Operating system: `[System.Environment]::OSVersion`
4. PowerShell version: `$PSVersionTable.PSVersion`
5. Debug output (`claude --debug`)
6. History file contents (if applicable)
7. Steps to reproduce
