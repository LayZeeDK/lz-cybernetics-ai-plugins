# Ralph Loop Implementation

This document is the technical reference for implementing a Ralph Loop. It covers the formal architecture (three phases, two prompts, one loop), context engineering strategies, subagent orchestration, stop hook mechanics, verification layers, state persistence, prompt structure, and alternative loop types. For conceptual background, see [OVERVIEW.md](./OVERVIEW.md). For failure patterns, see [FAILURE-MODES.md](./FAILURE-MODES.md). For practical tips, see [BEST-PRACTICES.md](./BEST-PRACTICES.md).

## Three Phases, Two Prompts, One Loop

The Ralph Playbook formalizes the workflow as a funnel with three phases, two prompts, and one loop mechanism.

> "This diagram clarified for me that Ralph isn't just 'a loop that codes.' It's a funnel with 3 Phases, 2 Prompts, and 1 Loop." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

### Phase 1: Define Requirements (LLM Conversation)

Phase 1 is a human-in-the-loop conversation, not a loop iteration. The human and LLM collaborate to:

1. Discuss project ideas and identify Jobs to Be Done (JTBD)
2. Break individual JTBDs into topics of concern
3. Use subagents to load information from URLs into context
4. Write `specs/FILENAME.md` for each topic of concern

**Terminology:**

| Term | Definition |
|------|-----------|
| Job to be Done (JTBD) | High-level user need or outcome |
| Topic of Concern | A distinct aspect or component within a JTBD |
| Spec | Requirements document for one topic of concern (`specs/FILENAME.md`) |
| Task | Unit of work derived from comparing specs to code |

**Relationships:** 1 JTBD yields multiple topics of concern. 1 topic yields 1 spec. 1 spec yields multiple tasks. Specs are larger than tasks.

**Topic Scope Test -- "One Sentence Without 'And'":**

> "Can you describe the topic of concern in one sentence without conjoining unrelated capabilities?" -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

If the description requires "and" to connect unrelated capabilities, the topic should be split. For example, "The user system handles authentication, profiles, and billing" is three topics, not one.

### Phase 2: Planning (Loop with Planning Prompt)

The planning phase uses the Ralph loop mechanism but with a planning-specific prompt. It typically completes in 1-2 iterations.

Each planning iteration:

1. Subagents study `specs/*` and existing `/src`
2. Compare specs against code (gap analysis)
3. Create or update `IMPLEMENTATION_PLAN.md` with prioritized tasks
4. No implementation, no commits

> "PLANNING prompt does gap analysis (specs vs code) and outputs a prioritized TODO list -- no implementation, no commits." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

### Phase 3: Building (Loop with Building Prompt)

The building phase is where Ralph iterates indefinitely. Each building iteration follows a 10-step lifecycle:

1. **Orient** -- subagents study `specs/*` (requirements)
2. **Read plan** -- study `IMPLEMENTATION_PLAN.md`
3. **Select** -- pick the most important task
4. **Investigate** -- subagents study relevant `/src` ("don't assume not implemented")
5. **Implement** -- N subagents for file operations
6. **Validate** -- 1 subagent for build/tests (backpressure)
7. **Update `IMPLEMENTATION_PLAN.md`** -- mark task done, note discoveries/bugs
8. **Update `AGENTS.md`** -- if operational learnings discovered
9. **Commit**
10. **Loop ends** -- context cleared, next iteration starts fresh

### Why Two Modes Use the Same Loop

| Mode | Why the loop? |
|------|--------------|
| BUILDING | Inherently iterative: many tasks multiplied by fresh context gives isolation |
| PLANNING | Consistency: same execution model; often completes in 1-2 iterations but allows multiple passes reading its own output |

> "Flexibility: if plan needs refinement, loop allows multiple passes reading its own output. Simplicity: one mechanism for everything; clean file I/O; easy stop/restart." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

## The Basic Loop

At minimum, Ralph is a bash infinite loop:

```bash
while :; do cat PROMPT.md | claude ; done
```

This pipes the same prompt into the AI agent repeatedly. The agent sees:

1. The prompt from `PROMPT.md`
2. Current file states on disk
3. Git history and status

The same approach works with other CLIs:

```bash
while :; do cat PROMPT.md | npx --yes @sourcegraph/amp ; done
```

> "The same approach can be used with other CLIs; e.g. `amp`, `codex`, `opencode`, etc." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

### What Controls Task Continuation?

The continuation mechanism is elegantly simple:

1. Bash loop runs -- feeds `PROMPT.md` to claude
2. `PROMPT.md` instructs -- "Study IMPLEMENTATION_PLAN.md and choose the most important thing"
3. Agent completes one task -- updates `IMPLEMENTATION_PLAN.md` on disk, commits, exits
4. Bash loop restarts immediately -- fresh context window
5. Agent reads updated plan -- picks next most important thing

> "No sophisticated orchestration needed -- just a dumb bash loop that keeps restarting the agent, and the agent figures out what to do next by reading the plan file each time." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

The `IMPLEMENTATION_PLAN.md` file persists on disk between iterations and acts as shared state between otherwise isolated loop executions. Each iteration deterministically loads the same files (`PROMPT.md` + `AGENTS.md` + `specs/*`) and reads the current state from disk.

## Context Engineering

Context engineering is the foundational discipline that makes Ralph effective. Every design decision in the loop -- fresh context per iteration, subagent delegation, small tasks -- serves context management. For token tracking zones and context utilization benchmarks, see [METRICS.md](./METRICS.md).

> "The name of the game is that you only have approximately 170k of context window to work with. So it's essential to use as little of it as possible. The more you use the context window, the worse the outcomes you'll get." -- Geoffrey Huntley, quoted in [Advanced Context Engineering](./sources/blog-advanced-context-engineering/)

### Token Budget Reality

While models advertise 200K tokens, the usable budget is smaller:

| Metric | Value |
|--------|-------|
| Advertised context | ~200K tokens |
| Usable context | ~176K tokens |
| Smart zone | 40-60% utilization |
| Warning threshold | 60-80% |
| Critical threshold | >80% (force rotation) |

> "When 200K+ tokens advertised = ~176K truly usable. And 40-60% context utilization for 'smart zone'. Tight tasks + 1 task per loop = 100% smart zone context utilization." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

### Context Optimization Hierarchy

Optimize your context window in this priority order:

1. **Correctness** -- incorrect information in context is the worst outcome
2. **Completeness** -- missing information is the second-worst outcome
3. **Noise reduction** -- too much noise degrades performance

> "The worst things that can happen to your context window, in order, are: 1. Incorrect Information, 2. Missing Information, 3. Too much Noise." -- [Advanced Context Engineering](./sources/blog-advanced-context-engineering/)

### Frequent Intentional Compaction

The advanced pattern described by Dex Horthy involves designing the entire development workflow around context management.

> "Essentially, this means designing your ENTIRE WORKFLOW around context management, and keeping utilization in the 40%-60% range." -- [Advanced Context Engineering](./sources/blog-advanced-context-engineering/)

**Ad-hoc compaction prompt example:**

> "Write everything we did so far to progress.md, ensure to note the end goal, the approach we're taking, the steps we've done so far, and the current failure we're working on" -- [Advanced Context Engineering](./sources/blog-advanced-context-engineering/)

**What eats up context:**

- Searching for files
- Understanding code flow
- Applying edits
- Test/build logs
- Large JSON blobs from tools

Compaction distills all of these into structured artifacts. A good compaction output includes the end goal, approach being taken, completed steps, current state, and next steps.

### Context Rotation Thresholds

```
Under 60%: Agent works freely (healthy)
60-80%:    Agent receives completion warning (wrap up current work)
Above 80%: Force rotation to fresh context (critical)
```

> "Healthy (< 60% tokens): Agent works freely. Warning (60-80%): Agent gets a heads-up to wrap up current work. Critical (> 80%): Forced rotation to fresh context." -- [Year of the Ralph Loop Agent](./sources/blog-year-of-ralph-loop-agent/)

Ralph's context rotation addresses what the Alibaba Cloud article calls "Context Rot" -- the linear decline in attention and precision as conversation rounds increase:

> "Each round of the loop can be seen as a brand new session, with the agent no longer reading states from bloated history records. The agent directly scans the current project structure and log files through file reading tools. This pattern shifts 'state management' from the LLM's memory (token sequence) to the disk (file system)." -- [ReAct to Ralph Loop](./sources/blog-react-to-ralph-loop/)

**Task Spawning Extension:** These thresholds apply to the orchestrator session. Each Task worker starts at 0% utilization regardless of orchestrator state, effectively resetting the context window. The 40-60% 'smart zone' governs the orchestrator's dispatch decisions; worker contexts are fresh by design. This means the orchestrator can delegate work even when it is in the >80% danger zone, as long as it can still formulate a clear work directive. See `research/task-spawning/TASK-SPAWNING-GUIDE.md`, 'Ralph-Style Context Rotation via Tasks'.

See [FAILURE-MODES.md](./FAILURE-MODES.md#context-related-failures) for detailed failure patterns around context rot and pollution. For Task-based context rotation within Claude Code plugins, see [TASK-SPAWNING-GUIDE.md](../task-spawning/TASK-SPAWNING-GUIDE.md#ralph-style-context-rotation-via-tasks).

## Subagent Orchestration

Subagents are not about anthropomorphizing roles -- they are about context control.

> "Subagents are not about playing house and anthropomorphizing roles. Subagents are about context control." -- [Advanced Context Engineering](./sources/blog-advanced-context-engineering/)

### Orchestration Pattern

The main agent context acts as a **task scheduler**. Expensive work is delegated to subagents whose context is garbage-collected after use.

| Operation | Agent Count | Reason |
|-----------|-------------|--------|
| Reading, searching, investigation | Up to 500 parallel subagents | Fan out to avoid polluting main context |
| Build and tests | Exactly 1 sequential subagent | Backpressure -- must complete before declaring success |
| Complex reasoning (debugging, architecture) | 1 Opus subagent | Higher-quality model for nuanced decisions |

> "Use main agent/context as a scheduler. Don't allocate expensive work to main context; spawn subagents whenever possible instead." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

> "Each subagent gets ~156kb that's garbage collected. Fan out to avoid polluting main context." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

**Task Tool Constraints:** The aspirational subagent figures above describe LLM-managed delegation within a single context. When using the Task tool for true process isolation, practical limits apply: ~7 concurrent Tasks per batch, ~20K token overhead per Task, and a 3-4x total token multiplier. Group related files into fewer Tasks (e.g., 3-5 Tasks reading 10-15 files each) to amortize overhead. See `research/task-spawning/TASK-SPAWNING-GUIDE.md` for the full cost model.

### Subagent Response Structuring

The ideal subagent response looks like a compaction artifact: the end goal, relevant files found, how information flows, potential issues, and recommended next steps. Getting a subagent to return well-structured, compacted responses is not trivial and requires explicit instructions in the prompt.

> "The ideal subagent response probably looks similar to the ideal ad-hoc compaction." -- [Advanced Context Engineering](./sources/blog-advanced-context-engineering/)

### Key Language for Subagent Instructions

The specific phrasing used when instructing the agent about subagents matters. From Geoff Huntley's prompt templates:

```markdown
Study `specs/*` with up to 500 parallel Sonnet subagents...
Use up to 500 Sonnet subagents to study existing source code...
Only 1 Sonnet subagent for build/tests.
Use Opus subagents when complex reasoning is needed (debugging, architectural decisions).
```

The words "using parallel subagents" / "up to N subagents" are critical language patterns that trigger the agent's subagent dispatching behavior.

## AGENTS.md as Heart of the Loop

`AGENTS.md` is the single, canonical operational guide loaded every iteration. It is the "heart of the loop."

> "Single, canonical 'heart of the loop' -- a concise, operational 'how to run/build' guide." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

### What AGENTS.md Is

- Describes how to build and run the project
- Captures operational learnings that improve the loop
- Contains project-specific commands enabling loopback (build, test, lint, typecheck)
- Kept brief (~60 lines)

### What AGENTS.md Is Not

- NOT a changelog or progress diary
- NOT a status update file
- Status, progress, and planning belong in `IMPLEMENTATION_PLAN.md`

> "IMPORTANT: Keep AGENTS.md operational only -- status updates and progress notes belong in `IMPLEMENTATION_PLAN.md`. A bloated AGENTS.md pollutes every future loop's context." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

### AGENTS.md Example Structure

```markdown
## Build & Run

Succinct rules for how to BUILD the project:

## Validation

Run these after implementing to get immediate feedback:

- Tests: `[test command]`
- Typecheck: `[typecheck command]`
- Lint: `[lint command]`

## Operational Notes

Succinct learnings about how to RUN the project:

### Codebase Patterns
```

The BUILDING prompt says "run tests" generically; `AGENTS.md` specifies the actual commands. This is how backpressure gets wired in per-project.

## Prompt Structure

### Prompt Anatomy

Both the planning and building prompts follow a structured format:

| Section | Purpose |
|---------|---------|
| Phase 0 (0a, 0b, 0c, 0d) | Orient: study specs, source location, current plan |
| Phases 1-4 | Main instructions: task, validation, commit |
| `999...` numbered guardrails | Invariants (higher number = more critical) |

Context loaded each iteration: `PROMPT.md` + `AGENTS.md`

### Guardrail Numbering Convention

The `99999...` numbering system is a priority convention where more digits indicate higher importance. This is not arbitrary -- the increasing digit count creates visual distinction and communicates relative weight to the LLM:

```
99999.        "capture the why" (5 digits)
999999.       "single sources of truth" (6 digits)
9999999.      "create git tags" (7 digits)
...
999999999999999. "Keep AGENTS.md operational only" (15 digits)
```

### Key Language Patterns

Specific phrasing from Geoff Huntley's prompts matters for agent behavior. These are not interchangeable with synonyms:

| Pattern | Why It Matters |
|---------|---------------|
| "study" (not "read" or "look at") | Implies deeper analysis, not just file access |
| "don't assume not implemented" | The Achilles' heel -- prevents agents from reimplementing existing code |
| "using parallel subagents" / "up to N subagents" | Triggers subagent dispatch behavior |
| "only 1 subagent for build/tests" | Enforces sequential backpressure |
| "Ultrathink" (previously "Think extra hard") | Activates extended reasoning mode |
| "capture the why" | Tests and documentation should explain purpose, not just describe |
| "keep it up to date" | Ensures state files remain current across iterations |
| "if functionality is missing then it's your job to add it" | Prevents agents from deferring work |
| "resolve them or document them" | Forces closure on discovered issues |
| "implement functionality completely" | Blocks placeholder and stub implementations |

> "Implement functionality completely. Placeholders and stubs waste efforts and time redoing the same work." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

### PROMPT_plan.md Template

```markdown
0a. Study `specs/*` with up to 250 parallel Sonnet subagents to learn the application specifications.
0b. Study @IMPLEMENTATION_PLAN.md (if present) to understand the plan so far.
0c. Study `src/lib/*` with up to 250 parallel Sonnet subagents to understand shared utilities & components.
0d. For reference, the application source code is in `src/*`.

1. Study @IMPLEMENTATION_PLAN.md (if present; it may be incorrect) and use up to 500 Sonnet subagents to study existing source code in `src/*` and compare it against `specs/*`. Use an Opus subagent to analyze findings, prioritize tasks, and create/update @IMPLEMENTATION_PLAN.md as a bullet point list sorted in priority of items yet to be implemented. Ultrathink. Consider searching for TODO, minimal implementations, placeholders, skipped/flaky tests, and inconsistent patterns. Study @IMPLEMENTATION_PLAN.md to determine starting point for research and keep it up to date with items considered complete/incomplete using subagents.

IMPORTANT: Plan only. Do NOT implement anything. Do NOT assume functionality is missing; confirm with code search first. Treat `src/lib` as the project's standard library for shared utilities and components. Prefer consolidated, idiomatic implementations there over ad-hoc copies.

ULTIMATE GOAL: We want to achieve [project-specific goal]. Consider missing elements and plan accordingly. If an element is missing, search first to confirm it doesn't exist, then if needed author the specification at specs/FILENAME.md. If you create a new element then document the plan to implement it in @IMPLEMENTATION_PLAN.md using a subagent.
```

### PROMPT_build.md Template

```markdown
0a. Study `specs/*` with up to 500 parallel Sonnet subagents to learn the application specifications.
0b. Study @IMPLEMENTATION_PLAN.md.
0c. For reference, the application source code is in `src/*`.

1. Your task is to implement functionality per the specifications using parallel subagents. Follow @IMPLEMENTATION_PLAN.md and choose the most important item to address. Before making changes, search the codebase (don't assume not implemented) using Sonnet subagents. You may use up to 500 parallel Sonnet subagents for searches/reads and only 1 Sonnet subagent for build/tests. Use Opus subagents when complex reasoning is needed (debugging, architectural decisions).
2. After implementing functionality or resolving problems, run the tests for that unit of code that was improved. If functionality is missing then it's your job to add it as per the application specifications. Ultrathink.
3. When you discover issues, immediately update @IMPLEMENTATION_PLAN.md with your findings using a subagent. When resolved, update and remove the item.
4. When the tests pass, update @IMPLEMENTATION_PLAN.md, then `git add -A` then `git commit` with a message describing the changes. After the commit, `git push`.

99999. Important: When authoring documentation, capture the why -- tests and implementation importance.
999999. Important: Single sources of truth, no migrations/adapters. If tests unrelated to your work fail, resolve them as part of the increment.
9999999. As soon as there are no build or test errors create a git tag. If there are no git tags start at 0.0.0 and increment patch by 1 for example 0.0.1 if 0.0.0 does not exist.
99999999. You may add extra logging if required to debug issues.
999999999. Keep @IMPLEMENTATION_PLAN.md current with learnings using a subagent -- future work depends on this to avoid duplicating efforts. Update especially after finishing your turn.
9999999999. When you learn something new about how to run the application, update @AGENTS.md using a subagent but keep it brief. For example if you run commands multiple times before learning the correct command then that file should be updated.
99999999999. For any bugs you notice, resolve them or document them in @IMPLEMENTATION_PLAN.md using a subagent even if it is unrelated to the current piece of work.
999999999999. Implement functionality completely. Placeholders and stubs waste efforts and time redoing the same work.
9999999999999. When @IMPLEMENTATION_PLAN.md becomes large periodically clean out the items that are completed from the file using a subagent.
99999999999999. If you find inconsistencies in the specs/* then use an Opus 4.5 subagent with 'ultrathink' requested to update the specs.
999999999999999. IMPORTANT: Keep @AGENTS.md operational only -- status updates and progress notes belong in `IMPLEMENTATION_PLAN.md`. A bloated AGENTS.md pollutes every future loop's context.
```

## File Structure

```
project-root/
├── loop.sh                         # Ralph loop script
├── PROMPT_build.md                 # Build mode instructions
├── PROMPT_plan.md                  # Plan mode instructions
├── AGENTS.md                       # Operational guide loaded each iteration
├── IMPLEMENTATION_PLAN.md          # Prioritized task list (generated/updated by Ralph)
├── specs/                          # Requirement specs (one per JTBD topic)
│   ├── [jtbd-topic-a].md
│   └── [jtbd-topic-b].md
├── src/                            # Application source code
└── src/lib/                        # Shared utilities & components
```

### Alternative File Structure (Alibaba Cloud Pattern)

The Alibaba Cloud article describes a variant using `prd.json` instead of Markdown:

```
scripts/ralph/
├── ralph.sh
├── prompt.md
├── prd.json
└── progress.txt
```

## Loop Script Implementation

### Minimal Loop

```bash
while :; do cat PROMPT.md | claude ; done
```

### Enhanced Loop with Mode Selection

Wraps the core loop with mode selection (plan/build), max-iterations support, and git push after each iteration.

```bash
#!/bin/bash
# Usage: ./loop.sh [plan] [max_iterations]
# Examples:
#   ./loop.sh              # Build mode, unlimited iterations
#   ./loop.sh 20           # Build mode, max 20 iterations
#   ./loop.sh plan         # Plan mode, unlimited iterations
#   ./loop.sh plan 5       # Plan mode, max 5 iterations

# Parse arguments
if [ "$1" = "plan" ]; then
    MODE="plan"
    PROMPT_FILE="PROMPT_plan.md"
    MAX_ITERATIONS=${2:-0}
elif [[ "$1" =~ ^[0-9]+$ ]]; then
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=$1
else
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=0
fi

ITERATION=0
CURRENT_BRANCH=$(git branch --show-current)

echo "Mode:   $MODE"
echo "Prompt: $PROMPT_FILE"
echo "Branch: $CURRENT_BRANCH"
[ $MAX_ITERATIONS -gt 0 ] && echo "Max:    $MAX_ITERATIONS iterations"

if [ ! -f "$PROMPT_FILE" ]; then
    echo "Error: $PROMPT_FILE not found"
    exit 1
fi

while true; do
    if [ $MAX_ITERATIONS -gt 0 ] && [ $ITERATION -ge $MAX_ITERATIONS ]; then
        echo "Reached max iterations: $MAX_ITERATIONS"
        break
    fi

    # -p: Headless mode (non-interactive, reads from stdin)
    # --dangerously-skip-permissions: Auto-approve all tool calls
    # --output-format=stream-json: Structured output for logging/monitoring
    # --model opus: Primary agent uses Opus for complex reasoning
    # --verbose: Detailed execution logging
    cat "$PROMPT_FILE" | claude -p \
        --dangerously-skip-permissions \
        --output-format=stream-json \
        --model opus \
        --verbose

    git push origin "$CURRENT_BRANCH" || {
        echo "Failed to push. Creating remote branch..."
        git push -u origin "$CURRENT_BRANCH"
    }

    ITERATION=$((ITERATION + 1))
    echo -e "\n\n======================== LOOP $ITERATION ========================\n"
done
```

**CLI flags explained:**

| Flag | Purpose |
|------|---------|
| `-p` | Headless mode: non-interactive operation, reads from stdin |
| `--dangerously-skip-permissions` | Bypasses all permission prompts for fully automated runs |
| `--output-format=stream-json` | Structured JSON output for logging and monitoring |
| `--model opus` | Uses Opus for task selection, prioritization, coordination |
| `--verbose` | Detailed execution logging |

### Completion Promise Pattern (Alternative)

Instead of relying on the bash `while` loop to restart, some implementations use a for-loop with a completion promise to detect when all work is done:

```bash
#!/bin/bash
set -e

MAX_ITERATIONS=${1:-10}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[INFO] Starting Ralph"

for i in $(seq 1 $MAX_ITERATIONS); do
  echo "=== Iteration $i ==="

  OUTPUT=$(cat "$SCRIPT_DIR/prompt.md" \
    | amp --dangerously-allow-all 2>&1 \
    | tee /dev/stderr) || true

  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo "[SUCCESS] Done!"
    exit 0
  fi

  sleep 2
done

echo "[WARN] Max iterations reached"
exit 1
```

> "If, while implementing the feature, you notice that all work is complete, output `<promise>COMPLETE</promise>`." -- [ReAct to Ralph Loop](./sources/blog-react-to-ralph-loop/)

This pattern is used in the ReAct-to-Ralph approach with the `prd.json` task structure: the prompt instructs the agent to output `<promise>COMPLETE</promise>` when all stories in the PRD pass. The outer script checks for this string and exits the loop early.

## Stop Hook Implementation

The Stop Hook is the mechanism that prevents the agent from prematurely exiting when it believes (incorrectly) that work is complete. It is a critical component for AFK (away-from-keyboard) operation.

> "The industrial implementation of Ralph Loop relies on deep interception of terminal interactions. Through the `hooks/stop-hook.sh` script, developers can capture the agent's intention to exit." -- [ReAct to Ralph Loop](./sources/blog-react-to-ralph-loop/)

### How It Works

1. The agent attempts to exit, believing its task is complete
2. The stop hook intercepts the exit attempt (exit code 2 mechanism)
3. The hook scans the agent's output for the predefined "Completion Promise"
4. If the promise is **not** found, the hook blocks the exit and reinjects the original prompt
5. If the promise **is** found, the agent is allowed to exit normally

> "If the agent does not output the user-specified commitment identifier (like `<promise>COMPLETE</promise>`), the stop hook prevents the normal session from completing." -- [ReAct to Ralph Loop](./sources/blog-react-to-ralph-loop/)

### Completion Promise Convention

The completion promise is a machine-parseable string embedded in the agent's output. The convention is to use XML-like tags:

```
<promise>COMPLETE</promise>
```

The prompt must define when to emit this promise:

```markdown
## Stop Condition

If ALL stories pass, reply:
<promise>COMPLETE</promise>
Otherwise end normally.
```

### Stop Hook in Prompt Design

The prompt must include both the completion criteria and the promise token:

```markdown
# Ralph Agent Instructions

## Your Task

1. Read `scripts/ralph/prd.json`
2. Read `scripts/ralph/progress.txt`
3. Check you're on the correct branch
4. Pick highest priority story where `passes: false`
5. Implement that ONE story
6. Run typecheck and tests
7. Update AGENTS.md files with learnings
8. Commit: `feat: [ID] - [Title]`
9. Update prd.json: `passes: true`
10. Append learnings to progress.txt

## Stop Condition

If ALL stories pass, reply:
<promise>COMPLETE</promise>
Otherwise end normally.
```

### Stop Hook vs. Infinite Loop

There are two complementary approaches:

| Approach | How It Works | Best For |
|----------|-------------|----------|
| Infinite `while` loop | Bash restarts the agent every time it exits | Fresh context per task, long-running sessions |
| Stop hook with `for` loop | Hook prevents premature exit within a session | Ensuring single-task completion, bounded iterations |

Both can be combined: the stop hook ensures the agent does not declare victory prematurely within a single iteration, while the outer `while` loop provides fresh context for the next task.

## Verification Layers (Backpressure)

Backpressure is the system of external checks that prevents the agent from declaring success when work is incorrect or incomplete. It is the primary steering mechanism.

> "Creating the right signals & gates to steer Ralph's successful output is critical. You can steer from two directions." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

### Deterministic Backpressure

Standard programmatic checks that must pass before a commit:

```bash
npm run lint          # ESLint
npm run typecheck     # TypeScript
npm run test          # Unit tests
npm run build         # Production build
```

The agent cannot "declare victory" until all checks pass. These are specified in `AGENTS.md` (project-specific) and referenced generically in the prompt ("run tests").

### Upstream vs. Downstream Steering

| Direction | Mechanism |
|-----------|-----------|
| **Upstream** (steer into) | Allocate first ~5,000 tokens for specs; every loop starts from known state (`PROMPT.md` + `AGENTS.md`); existing code patterns shape agent behavior |
| **Downstream** (steer with) | Tests, typechecks, lints, builds reject invalid work; prompt says "run tests" generically; `AGENTS.md` specifies actual commands |

> "Your existing code shapes what gets used and generated. If Ralph is generating wrong patterns, add/update utilities and existing code patterns to steer it toward correct ones." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

### Acceptance-Driven Backpressure

An enhancement pattern that connects acceptance criteria in specs directly to test requirements in the implementation plan:

> "This enhancement connects acceptance criteria (in specs) directly to test requirements (in implementation plan), improving backpressure quality." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

The architecture creates a three-phase connection:

```
Phase 1: Requirements Definition
    specs/*.md + Acceptance Criteria
    |
Phase 2: Planning (derives test requirements)
    IMPLEMENTATION_PLAN.md + Required Tests
    |
Phase 3: Building (implements with tests)
    Implementation + Tests -> Backpressure
```

Key distinction: specify WHAT to verify (outcomes), not HOW to implement (approach). This maintains "Let Ralph Ralph" -- Ralph decides implementation details while having clear success signals.

### Non-Deterministic Backpressure (LLM-as-Judge)

For acceptance criteria that resist programmatic validation -- creative quality, aesthetics, UX feel, content appropriateness -- LLM-as-judge tests provide backpressure with binary pass/fail:

> "Some acceptance criteria resist programmatic checks -- creative quality, aesthetics, UX feel. LLM-as-judge tests can provide backpressure for subjective criteria with binary pass/fail." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

LLM reviews are non-deterministic (same artifact may receive different judgments across runs). This aligns with Ralph's philosophy: "deterministically bad in an undeterministic world." The loop provides eventual consistency through iteration -- reviews run until pass, accepting natural variance.

See [BEST-PRACTICES.md](./BEST-PRACTICES.md#use-feedback-loops) for practical feedback loop configuration.

## State Persistence Files

### progress.md / progress.txt

Append-only log tracking iteration-by-iteration progress:

```markdown
## Iteration 5
- [OK] Implemented user authentication
- [OK] Added JWT middleware
- Changed: src/auth/*, src/middleware/jwt.ts
- Next: Add refresh token logic
```

The Alibaba Cloud variant adds a "Codebase Patterns" section at the top for quick reference:

```markdown
# Ralph Progress Log
Started: 2024-01-15

## Codebase Patterns
- Migrations: IF NOT EXISTS
- Types: Export from actions.ts

## Key Files
- db/schema.ts
- app/auth/actions.ts
---

## 2024-01-15 - US-001
- What was implemented: Added login form with email/password fields
- Files changed: app/auth/login.tsx, app/auth/actions.ts
- **Learnings:**
  - Patterns discovered: Use IF NOT EXISTS for migrations
  - Gotchas encountered: Need to handle email validation on both client and server
```

> "Maintain a 'codebase patterns' section at the top of progress.txt for quick reference in subsequent iterations." -- [ReAct to Ralph Loop](./sources/blog-react-to-ralph-loop/)

### prd.json (Alternative to Markdown Plans)

A structured JSON format for task tracking, where each story has a `passes` field:

```json
{
  "branchName": "ralph/feature",
  "userStories": [
    {
      "id": "US-001",
      "title": "Add login form",
      "acceptanceCriteria": [
        "Email/password fields",
        "Validates email format",
        "typecheck passes"
      ],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

> "Ralph marks `passes` to `true` when complete. The PRD becomes both scope definition and progress tracker -- a living TODO list rather than a waterfall document." -- [Tips for AI Coding with Ralph](./sources/blog-tips-for-ai-coding-ralph/)

### IMPLEMENTATION_PLAN.md

Prioritized bullet-point list of tasks derived from gap analysis (specs vs code):

- Created via PLANNING mode
- Updated during BUILDING mode (mark complete, add discoveries, note bugs)
- Can be regenerated -- Huntley: "I have deleted the TODO list multiple times"
- Self-correcting -- BUILDING mode can even create new specs if missing

> "No pre-specified template -- let Ralph/LLM dictate and manage format that works best for it." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

The circularity is intentional: eventual consistency through iteration.

### guardrails.md

Learned constraints that persist across iterations. When something fails, the agent adds a "Sign":

```markdown
### Sign: Check imports before adding
- **Trigger**: Adding a new import statement
- **Instruction**: First check if import already exists in file
- **Added after**: Iteration 3 - duplicate import caused build failure

### Sign: Run type check before commit
- **Instruction**: Execute `npm run typecheck` before any commit
- **Reason**: Type errors slipped through in iteration 7
```

> "Future iterations read these guardrails first and follow them, preventing repeated mistakes. It's a simple but effective form of agent memory across context rotations." -- [Year of the Ralph Loop Agent](./sources/blog-year-of-ralph-loop-agent/)

## Inner Loop Control (Task Execution)

A single task execution has no hard technical limit. Control relies on:

- **Scope discipline** -- `PROMPT.md` instructs "one task" and "commit when tests pass"
- **Backpressure** -- tests/build failures force the agent to fix issues before committing
- **Natural completion** -- agent exits after successful commit

> "Ralph can go in circles, ignore instructions, or take wrong directions -- this is expected and part of the tuning process." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

When Ralph "tests you" by failing in specific ways, you add guardrails to the prompt or adjust backpressure mechanisms. The nondeterminism is manageable through observation and iteration.

## Docker Sandboxing

For AFK (away-from-keyboard) runs:

```bash
docker sandbox run claude
```

Benefits:

- Agent can edit project files and commit
- Cannot access home directory, SSH keys, system files
- Limits blast radius of mistakes

Tradeoff: Global `AGENTS.md` and user skills will not be loaded.

> "Running without a sandbox exposes credentials, browser cookies, SSH keys, and access tokens on your machine." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

> "Philosophy: 'It's not if it gets popped, it's when. And what is the blast radius?'" -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

For a comprehensive security framework covering all containment tiers (native OS sandbox, devcontainers, Docker Desktop sandbox, VM isolation), threat models, supply chain risks, and recommended configurations per risk level, see [SECURITY.md](./SECURITY.md).

## Alternative Loop Types

Ralph does not need to work through a feature backlog. The loop mechanism is generic -- any task that can be described as "look at repo, improve something, report findings" fits the pattern. Only the prompt changes.

> "Any task that can be described as 'look at repo, improve something, report findings' fits the Ralph pattern. The loop is the same. Only the prompt changes." -- [Tips for AI Coding with Ralph](./sources/blog-tips-for-ai-coding-ralph/)

### Test Coverage Loop

Point Ralph at coverage metrics. It finds uncovered lines, writes tests, and iterates until coverage meets a target.

```markdown
@coverage-report.txt
Find uncovered lines in the coverage report.
Write tests for the most critical uncovered code paths.
Run coverage again and update coverage-report.txt.
Target: 80% coverage minimum.
```

> "I used this to take AI Hero CLI from 16% to 100% coverage." -- [Tips for AI Coding with Ralph](./sources/blog-tips-for-ai-coding-ralph/)

### Duplication Loop

Connect Ralph to `jscpd` to find duplicate code. Ralph identifies clones, refactors into shared utilities, and reports changes.

### Linting Loop

Feed Ralph linting errors. It fixes them one by one, running the linter between iterations to verify each fix.

```markdown
Run: npm run lint
Fix ONE linting error at a time.
Run lint again to verify the fix.
Repeat until no errors remain.
```

### Entropy Loop

Ralph scans for code smells -- unused exports, dead code, inconsistent patterns -- and cleans them up. Software entropy in reverse.

```markdown
Scan for code smells: unused exports, dead code, inconsistent patterns.
Fix ONE issue per iteration.
Document what you changed in progress.txt.
```

## Framework Implementations

Several frameworks and tools have implemented Ralph Loop support, demonstrating its generality beyond bash scripts. For a broader comparison including dedicated orchestrators (ralph-orchestrator, Ralph TUI), spec-driven tools (Spec Kit, GSD), and the full agentic coding landscape, see [ALTERNATIVES.md](./ALTERNATIVES.md). For a cybernetics-inspired plugin design guide that improves on these implementations, see [PLUGIN-GUIDE.md](./PLUGIN-GUIDE.md).

### LangChain / DeepAgents

```bash
uv run deepagents --ralph "Build a Python programming course" --ralph-iterations 5
```

The `--ralph-iterations` parameter specifies the maximum loop count.

> See [LangChain DeepAgents ralph_mode example](https://github.com/langchain-ai/deepagents/tree/master/examples/ralph_mode) -- [ReAct to Ralph Loop](./sources/blog-react-to-ralph-loop/)

### Kimi-cli

Kimi-cli supports Ralph through its `loop_control` configuration, which controls the behavior of the agent executing loops.

> See [Kimi-cli configuration docs](https://moonshotai.github.io/kimi-cli/en/configuration/config-files.html) -- [ReAct to Ralph Loop](./sources/blog-react-to-ralph-loop/)

### Vercel AI SDK (ralph-loop-agent)

A JavaScript implementation providing fine-grained development control with an inner AI SDK tool loop and an outer Ralph loop:

```
+------------------------------------------------------+
|                   Ralph Loop (outer)                 |
|  +------------------------------------------------+  |
|  |  AI SDK Tool Loop (inner)                      |  |
|  |  LLM <-> tools <-> LLM <-> tools ... until done |  |
|  +------------------------------------------------+  |
|                         |                            |
|  verifyCompletion: "Is the TASK actually complete?"  |
|                         |                            |
|       No? -> Inject feedback -> Run another iteration |
|       Yes? -> Return final result                     |
+------------------------------------------------------+
```

```javascript
import { RalphLoopAgent, iterationCountIs } from 'ralph-loop-agent';

const migrationAgent = new RalphLoopAgent({
  model: 'anthropic/claude-opus-4.5',
  instructions: `You are migrating a codebase from Jest to Vitest.

    Completion criteria:
    - All test files use vitest imports
    - vitest.config.ts exists
    - All tests pass when running 'pnpm test'`,

  tools: { readFile, writeFile, execute },

  stopWhen: iterationCountIs(50),

  verifyCompletion: async () => {
    const checks = await Promise.all([
      fileExists('vitest.config.ts'),
      !await fileExists('jest.config.js'),
      noFilesMatch('**/*.test.ts', /from ['"]@jest/),
      fileContains('package.json', '"vitest"'),
    ]);

    return {
      complete: checks.every(Boolean),
      reason: checks.every(Boolean) ? 'Migration complete' : 'Structural checks failed'
    };
  },

  onIterationStart: ({ iteration }) => console.log(`Starting iteration ${iteration}`),
  onIterationEnd: ({ iteration, duration }) => console.log(`Iteration ${iteration} completed in ${duration}ms`),
});

const result = await migrationAgent.loop({
  prompt: 'Migrate all Jest tests to Vitest.',
});
```

> "stopWhen and verifyCompletion customize loop exit logic." -- [ReAct to Ralph Loop](./sources/blog-react-to-ralph-loop/)

Key features: model and task descriptions with clear completion criteria, customizable `stopWhen` and `verifyCompletion` hooks, and event hooks for logging and monitoring.

## Comparison with Traditional Agent Loops

Understanding how Ralph differs from conventional agent patterns:

| Dimension | Conventional Agent Loop (ReAct / Plan-Execute) | Ralph Loop |
|-----------|------------------------------------------------|------------|
| Control Subject | Agent internal logic (LLM decides when to stop) | External scripts / stop hooks (forced restart) |
| Exit Condition | LLM self-assessment or max reasoning steps | Exact string match ("Completion Promise") |
| Context State | Single session history that expands with steps | Cross-session persistence via files and Git |
| Tolerance Mechanism | Attempts to fix errors in reasoning chain | Allows tasks to fail and exit; restarts from file system |
| Typical Uses | Real-time Q&A, dynamic queries, limited-step tasks | Mechanical restructuring, large-scale test migration, overnight development |
| Risk Points | Goal drift, context rot, token overconsumption | Infinite loops (limited by max-iterations), token overconsumption |

> "Ralph Loop breaks the limitations of relying on the LLM's self-assessment. Its implementation mechanism adopts Stop Hook technology: when an agent attempts to exit the current session (believing the task is complete), the system cuts off the exit signal through specific exit codes (like exit code 2)." -- [ReAct to Ralph Loop](./sources/blog-react-to-ralph-loop/)

## Sources

- [The Ralph Playbook (how-to-ralph-wiggum)](./sources/repo-how-to-ralph-wiggum/) -- Clayton Farr
- [From ReAct to Ralph Loop](./sources/blog-react-to-ralph-loop/) -- DanKun (Alibaba Cloud)
- [Advanced Context Engineering for Coding Agents](./sources/blog-advanced-context-engineering/) -- Dex Horthy (HumanLayer)
- [11 Tips for AI Coding with Ralph Wiggum](./sources/blog-tips-for-ai-coding-ralph/) -- Matt Pocock (AI Hero)
- [2026: The Year of the Ralph Loop Agent](./sources/blog-year-of-ralph-loop-agent/) -- Alexander Gekov (DEV Community)
