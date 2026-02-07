# Ralph Loop Implementation

## The Basic Loop

At minimum, Ralph is a bash infinite loop:

```bash
while :; do cat PROMPT.md | claude ; done
```

This pipes the same prompt into the AI agent repeatedly. The agent sees:

1. The prompt from `PROMPT.md`
2. Current file states on disk
3. Git history and status

## File Structure

A typical Ralph setup:

```
project-root/
├── loop.sh                 # Orchestration script
├── PROMPT.md               # Main prompt (or split into modes)
├── PROMPT_build.md         # Building mode instructions
├── PROMPT_plan.md          # Planning mode instructions
├── AGENTS.md               # Operational learnings/guardrails
├── IMPLEMENTATION_PLAN.md  # Prioritized task list (shared state)
├── .ralph/
│   ├── progress.md         # Tracks advancement
│   └── guardrails.md       # Learned constraints
├── specs/                  # Requirement documents
└── src/                    # Application code
```

## Loop Script Example

```bash
#!/bin/bash
# loop.sh - Ralph orchestrator

MODE="${1:-build}"
MAX_ITERATIONS="${2:-0}"  # 0 = unlimited
ITERATION=0

while true; do
    ITERATION=$((ITERATION + 1))

    if [ "$MAX_ITERATIONS" -gt 0 ] && [ "$ITERATION" -gt "$MAX_ITERATIONS" ]; then
        echo "[INFO] Max iterations ($MAX_ITERATIONS) reached"
        exit 0
    fi

    echo "[INFO] === Iteration $ITERATION ==="

    if [ "$MODE" = "plan" ]; then
        cat PROMPT_plan.md | claude
    else
        cat PROMPT_build.md | claude
    fi

    # Optional: push after each iteration
    # git push
done
```

Usage:

```bash
./loop.sh              # Build mode, unlimited
./loop.sh 20           # Build mode, max 20 iterations
./loop.sh plan         # Plan mode, unlimited
./loop.sh plan 5       # Plan mode, max 5 iterations
```

## Two-Mode Architecture

### Planning Mode (PROMPT_plan.md)

Purpose:

- Performs gap analysis between specs and code
- Generates/updates IMPLEMENTATION_PLAN.md
- No implementation or commits

Use when:

- No plan exists
- Plan is stale or needs regeneration

### Building Mode (PROMPT_build.md)

Purpose:

- Implements from the plan
- Runs tests and validates
- Commits on success
- Updates plan as side effect

Use when:

- Plan exists and is current
- Ready to implement

## PROMPT.md Structure

Key sections to include:

```markdown
# Task Context

[What we're building, current state]

# Success Criteria

[Objective, verifiable conditions for "done"]

# Constraints

[Rules, patterns to follow, things to avoid]

# Current Plan

See IMPLEMENTATION_PLAN.md for prioritized tasks.

# Instructions

1. Study the codebase before making changes
2. Implement ONE task from the plan
3. Run tests after changes
4. Commit only when tests pass
5. Update IMPLEMENTATION_PLAN.md with progress
```

## Context Management

### Token Budget Strategy

Available context (~176K usable tokens) should be allocated:

| Purpose | Allocation |
|---------|------------|
| Specifications | First ~5,000 tokens |
| Codebase context | Variable |
| Working space | Remainder |

### Context Rotation Thresholds

```
Under 60%: Agent works freely
60-80%: Agent receives completion warning
Above 80%: Force rotation to fresh context
```

### Subagent Strategy

- Use main agent context as **task scheduler**
- Spawn **subagents** for expensive work (reading, searching)
- Keep build/test operations sequential (1 agent)
- Up to 500 parallel subagents for read operations

## State Persistence Files

### progress.md / progress.txt

Append-only log tracking:

- Completed tasks
- Key decisions made
- Blockers encountered
- Files changed

```markdown
## Iteration 5
- [OK] Implemented user authentication
- [OK] Added JWT middleware
- Changed: src/auth/*, src/middleware/jwt.ts
- Next: Add refresh token logic
```

### IMPLEMENTATION_PLAN.md

Structured task list with:

- Priority ordering
- Completion status
- Dependencies

```markdown
# Implementation Plan

## In Progress
- [ ] Add refresh token endpoint

## Completed
- [x] Set up JWT authentication
- [x] Create user model

## Blocked
- [ ] OAuth integration (waiting on API keys)
```

### guardrails.md

Learned constraints persisted across iterations:

```markdown
### Sign: Check imports before adding
- **Instruction**: Verify import doesn't already exist
- **Reason**: Duplicate imports caused build failures in iteration 3

### Sign: Run type check before commit
- **Instruction**: Execute `npm run typecheck` before any commit
- **Reason**: Type errors slipped through in iteration 7
```

## Verification Layers (Backpressure)

Configure external checks that must pass:

```bash
# Pre-commit hooks or CI checks
npm run lint          # ESLint
npm run typecheck     # TypeScript
npm run test          # Unit tests
npm run build         # Production build
```

The agent cannot "declare victory" until all checks pass.

## Docker Sandboxing

For AFK (away-from-keyboard) runs:

```bash
docker sandbox run claude
```

Benefits:

- Agent can edit project files and commit
- Cannot access home directory, SSH keys, system files
- Limits blast radius of mistakes

## Stop Hooks

Use Stop Hook interception to prevent premature exit:

```javascript
// Only allow exit when completion promise is matched
if (!outputContains(COMPLETION_PROMISE)) {
    return { decision: "block", reason: "Task not complete" };
}
```

## Sources

- [GitHub - how-to-ralph-wiggum](https://github.com/ghuntley/how-to-ralph-wiggum)
- [DEV Community - 2026: The Year of the Ralph Loop Agent](https://dev.to/alexandergekov/2026-the-year-of-the-ralph-loop-agent-1gkj)
- [AI Hero - 11 Tips For AI Coding With Ralph Wiggum](https://www.aihero.dev/tips-for-ai-coding-with-ralph-wiggum)
