---
name: lz-cybernetics.governor:debug
description: Toggle debug logging for lz-cybernetics.governor hooks
argument-hint: "on | off | status"
allowed-tools:
  - Bash(node *)
---

# LZ-Cybernetics Debug Toggle

Toggle debug logging for the lz-cybernetics.governor hooks.

## Arguments

Parse the argument from `$ARGUMENTS`:
- `on` - Enable debug logging
- `off` - Disable debug logging
- `status` (or no argument) - Show current debug status

## Debug Flag Location

The debug flag file is located at `os.tmpdir()/lz-cybernetics.governor/debug-enabled`:
- **Windows:** `%TEMP%\lz-cybernetics.governor\debug-enabled`
- **macOS/Linux:** `/tmp/lz-cybernetics.governor/debug-enabled`

## Instructions

**IMPORTANT:** Use the Node.js scripts in the plugin's `commands/scripts/` directory for all operations.

The scripts are located relative to the plugin directory:
- `commands/scripts/debug-enable.mjs` - Creates the debug flag file
- `commands/scripts/debug-disable.mjs` - Removes the debug flag file
- `commands/scripts/debug-status.mjs` - Checks if debug is enabled

### Command Logic

Based on the argument from `$ARGUMENTS`:

**If "on":**
1. Run the enable script: `node commands/scripts/debug-enable.mjs`
2. Confirm: "Debug logging enabled. Hook debug info will appear in `_debug` field of JSON output."
3. Show the flag file location from the script output

**If "off":**
1. Run the disable script: `node commands/scripts/debug-disable.mjs`
2. Confirm: "Debug logging disabled."

**If "status" or no argument:**
1. Run the status script: `node commands/scripts/debug-status.mjs`
2. Based on the output ("enabled" or "disabled"), report:
   - "Debug logging is currently **enabled**" if output is "enabled"
   - "Debug logging is currently **disabled**" if output is "disabled"
