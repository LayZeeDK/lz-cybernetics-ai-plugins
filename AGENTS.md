# Agents Guide

Guidelines for Claude when developing and maintaining plugins in this repository.

## Repository Purpose

A collection of Claude Code plugins inspired by Cybernetics..

## Platform Requirements

Plugins must support macOS, Linux, and Windows. You can assume:

- Node.js LTS is installed
- Python 3 is installed
- When the operating system is Windows:
  - Git Bash is available via the Bash tool
  - The `claude` CLI runs from PowerShell

Use Node.js scripts for cross-platform operations rather than shell-specific commands.

## Development Tooling

Use the `plugin-dev` Claude plugin to create and maintain plugins:

```
/plugin install plugin-dev@claude-plugins-official
```

## Plugin Architecture

### Directory Structure

Each plugin follows this structure:

```
plugins/<plugin-name>/
├── .claude-plugin/
│   └── plugin.json        # Plugin metadata and version
├── README.md              # User-facing documentation
├── agents/                # AI agent definitions
├── commands/              # Slash commands
├── hooks/
│   ├── hooks.json         # Hook configuration
│   └── scripts/           # Hook implementation scripts
└── skills/
    └── <skill-name>/
        ├── SKILL.md       # Skill definition
        ├── references/    # Reference documentation
        └── examples/      # Usage examples
```

### Conventions

**Tool Restrictions**: Commands should use `allowed-tools` to restrict available tools and prevent unintended modifications.

### allowed-tools Syntax

Use modern `Bash(command *)` syntax (space before wildcard). The colon syntax `Bash(command:*)` is deprecated.

```yaml
# Correct - modern syntax
allowed-tools: Bash(git branch *), Bash(git status *), Read

# Deprecated - legacy syntax (avoid)
allowed-tools: Bash(git branch:*), Bash(git status:*), Read
```

Pattern examples:

| Pattern | Matches |
|---------|---------|
| `Bash(git branch *)` | `git branch`, `git branch -a`, `git branch backup/...` |
| `Bash(git *)` | All git commands |
| `Bash(npm run *)` | All npm run scripts |

For agents, use the array format: `tools: ["Bash", "Read", "Edit"]`

**Arguments**: Use `argument-hint` to document expected arguments. Parse values from `$ARGUMENTS`.

**Safety**: Always create backup branches before destructive operations using UTC timestamps. Include the plugin name and current branch for traceability: `<plugin>/<operation>/<branch>/backup-YYYYMMDD-HHMMSSZ`

**Output Formatting**: Use fenced markdown code blocks with language identifiers for syntax highlighting.

**File Type Awareness**: Handle different file types appropriately (source code, config files, lock files, etc.).

## Hooks

### Environment Variables

`${CLAUDE_PLUGIN_ROOT}` is substituted by the plugin system in `hooks.json` but **NOT** in command markdown files with `!` backtick syntax. For commands, use inline approaches or the `date` command (available via Git Bash on all platforms).

### PostToolUse Hook Output

Two approaches for adding information after tool execution:

| Approach | Behavior |
|----------|----------|
| `additionalContext` | Claude "considers" it but may paraphrase |
| `decision: "block"` with `reason` | Claude is automatically prompted and acts on it |

Use `decision: "block"` when you need Claude to take specific action:

```json
{
  "decision": "block",
  "reason": "Describe what Claude should do or tell the user."
}
```

### Hook Input Formats

PostToolUse hooks may receive different input formats. Handle both:

```javascript
const result = input.tool_result || input.tool_response?.stdout || '';
```

### Avoiding Command Substitution

Commands containing `$()` or backtick substitution trigger permission prompts regardless of `allowed-tools` patterns. This is a security feature.

```bash
# BAD - triggers permission prompt even with Bash(git branch *) allowed
git branch backup/$(date -u +"%Y%m%d-%H%M%SZ")

# GOOD - split into separate commands
date -u +"%Y%m%d-%H%M%SZ"    # Get timestamp first
git branch backup/<TIMESTAMP> # Then use the value
```

The `!` backtick preprocessing syntax also blocks `$()`:
```
# This will fail with "Command contains $() command substitution"
!`git branch backup/$(date -u +"%Y%m%d-%H%M%SZ")`
```

### Cross-Platform Timestamps

For backup branches, use `date -u` which works on macOS, Linux, and Windows (via Git Bash). The `Z` suffix indicates UTC:

```bash
git rev-parse --abbrev-ref HEAD  # Get current branch
date -u +"%Y%m%d-%H%M%SZ"         # Get UTC timestamp
git branch <plugin>/<operation>/<branch>/backup-<TIMESTAMP>
```

## Code Style

- Use Node.js for scripts requiring cross-platform compatibility
- **Always use the `node:` protocol for built-in modules** (e.g., `import fs from 'node:fs'` instead of `import fs from 'fs'`). This makes it explicit that the module is a Node.js built-in and not an npm package, improving code clarity and preventing potential naming conflicts
- Prefer semantic analysis over pattern matching when resolving conflicts
- Flag uncertain situations for human review rather than guessing
- Keep commands focused on single responsibilities

### Research Tools

Two tools in `tools/` support dedicated research by extracting web and video content into Markdown files that Claude can read and analyze.

#### url-to-markdown

Fetches a web page, extracts article content with Mozilla Readability, and converts it to clean Markdown.

```bash
node tools/url-to-markdown/url-to-markdown.mjs <url> --output <path>
```

**When to use:**

- WebFetch returns 403/429 (bot protection blocking AI agents)
- WebFetch returns a summary but you need full, unabridged article content
- Dedicated research requiring raw content rather than Haiku-summarized text

**Capabilities:** Chrome-like TLS/HTTP2 fingerprints via `impit` + realistic browser headers via `header-generator` bypass most bot detection (Cloudflare, Akamai, DataDome). Readability extraction strips navigation, ads, and boilerplate.

**Limitations:** Static HTML only. Pages requiring JavaScript rendering need Playwriter (available as a skill, MCP, npm package, and CLI) as a last-resort fallback.

**Options:** `--json` saves intermediate JSON metadata alongside the Markdown file. `--output <prefix>` controls the output path (produces `<prefix>.md`).

See `tools/url-to-markdown/README.md` for technical details on why Node.js built-in TLS cannot mimic Chrome and how `impit` solves this.

#### youtube-to-markdown

Extracts a YouTube video transcript and metadata using the InnerTube API (no browser required), then converts to structured Markdown with chapters and timestamped links.

```bash
node tools/youtube-to-markdown/youtube-to-markdown.mjs <video-id-or-url> --output <path>
```

**When to use:**

- Researching video content (conference talks, tutorials, presentations)
- Extracting a full transcript for analysis or summarization
- Getting structured content from a video without watching it

**Capabilities:** Chapter detection from video descriptions, timestamped YouTube links in headings, intelligent paragraph grouping with sentence-boundary detection. Includes `summarize-transcript.prompt.md` as an AI prompt template.

**Limitations:** Depends on the video having captions available. Auto-generated YouTube chapters are not accessible via the API; only description-based chapters are extracted.

**Options:** `--json` saves intermediate JSON with raw transcript data. `--output <prefix>` controls the output path (produces `<prefix>.md`).

A secondary script converts existing JSON to Markdown: `node tools/youtube-to-markdown/transcript-to-markdown.mjs <path>.json`

See `tools/youtube-to-markdown/README.md` for full documentation.

### URL Fetching in Scripts

When writing tools or scripts that fetch URLs, handle bot protection gracefully:

1. Use `impit` + `header-generator` for Chrome-like TLS/HTTP2 fingerprints and realistic browser headers (see `tools/url-to-markdown/url-to-markdown.mjs` for the implementation pattern)
2. Detect 403/429 responses and log actionable warnings with alternative suggestions
3. Suggest Playwriter as a last-resort fallback in warning messages

For details on the TLS fingerprinting approach, see `tools/url-to-markdown/README.md`.

### No Emojis in Scripts

**Never use emojis or Unicode symbols in scripts.** Windows console uses codepage cp1252 by default, which cannot encode multi-byte UTF-8 characters.

**What breaks:**
- PowerShell scripts (`.ps1`): Parser confusion, `Unexpected token` errors
- Python scripts: `UnicodeEncodeError: 'charmap' codec can't encode character`
- Any script with redirected/piped output

**Why it happens:** When stdout is redirected or piped (common in CI/CD and automated tooling), Windows falls back to cp1252 encoding which only supports 256 characters—no emoji support.

**ASCII replacement table:**

| Emoji | Replacement |
|-------|-------------|
| `✓` | `[OK]` |
| `❌` | `[ERROR]` |
| `✅` | `[SUCCESS]` |
| `⚠️` | `[WARN]` |
| `⏭️` | `[SKIP]` |
| `🔧` | `[INFO]` |
| `📁` | `[DIR]` |
| `📄` | `[FILE]` |

**Example:**
```python
# BAD - fails on Windows
print("✅ Build successful!")

# GOOD - works everywhere
print("[SUCCESS] Build successful!")
```

## Git Conventions

### No AI Attribution in Commits

**Never add AI attribution to commits or PRs.** Do not include:
- `Co-Authored-By: Claude ...` or any variant
- `Generated with [Claude Code]` or similar tool attribution lines
- Any AI tool signatures, watermarks, or credits

Write commit messages that describe the change, not the tool used to make it.

## Testing Changes

After modifying plugin files, verify:

1. Scripts execute correctly on the current platform
2. Hook configurations are valid JSON
3. Markdown files render correctly
4. Commands work with expected arguments
