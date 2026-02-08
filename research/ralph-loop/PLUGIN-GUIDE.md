# Cybernetics-Inspired Plugin Design: Beyond Ralph

This document is a design guide for building Claude Code plugins that improve on the Ralph Loop using Cybernetics theory. It is not a translation guide -- it is an innovation guide. Where existing implementations replicate Ralph's mechanics, this document uses cybernetic analysis to identify what they get wrong and proposes architecturally sound alternatives.

**Prerequisites:** [OVERVIEW.md](./OVERVIEW.md) (Ralph concepts), [IMPLEMENTATION.md](./IMPLEMENTATION.md) (technical patterns), [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md) (theoretical framework).

**Prior art:** The [lz-cybernetics.governor](../../plugins/lz-cybernetics.governor/) plugin demonstrates first-order cybernetic feedback (observe-compare-correct) applied to Claude Code tool calls. This guide extends that foundation with variety management, damping, autopoiesis, and context rotation.

## The AGENTS.md Naming Collision

"AGENTS.md" means two different things in this ecosystem, and conflating them causes confusion:

| Context | Meaning | Purpose |
|---------|---------|---------|
| **Ralph's AGENTS.md** | Operational guide for the project being built | Contains build/test/lint commands, codebase patterns, operational learnings. "Heart of the loop" -- loaded every iteration |
| **Repository AGENTS.md** | Guidelines for developing Claude Code plugins | Contains plugin conventions, hook patterns, code style, safety rules |

In practice, they coexist without conflict because they occupy different repositories and serve different audiences. Ralph's AGENTS.md lives in the target project; the repository AGENTS.md lives in the plugin development repo. The collision matters only when discussing both in the same document -- as this guide does. We use "Ralph's AGENTS.md" and "repository AGENTS.md" to disambiguate.

## Existing Ralph Implementations: Lessons Learned

Several implementations carry the "Ralph" label. They differ fundamentally in how they handle context clearing -- the feature that distinguishes Ralph from "just running an agent for a long time." For detailed comparison tables, see [ALTERNATIVES.md](./ALTERNATIVES.md).

### Anthropic's Official Plugin (ralph-loop / ralph-wiggum)

**Source:** [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/ralph-loop) (ralph-loop) and [anthropics/claude-code](https://github.com/anthropics/claude-code) (ralph-wiggum)

Two repositories, same architecture: a Stop hook intercepts the agent's exit, scans output for a `<promise>` completion tag, and re-injects the prompt within the same Claude Code session.

**What it gets right:**

- Elegant simplicity -- Stop hook with completion promise detection
- File system as state machine (Markdown state file, JSONL transcript)
- Low barrier to entry for Claude Code users

**Critical flaw: no context rotation.** The session accumulates context across all iterations. Auto-compaction is the only context management, and it is lossy -- it can discard specifications, tasks, and objectives. As Horthy observed:

> "it misses the key point of ralph which is not 'run forever' but in 'carve off small bits of work into independent context windows'." -- [A Brief History of Ralph](./sources/blog-brief-history-of-ralph/)

The January 2026 Showdown benchmark demonstrated this concretely: the plugin got stuck repeating "All milestones complete. Project is complete." within a single context window, while the bash loop version continued finding new work across fresh iterations ([Ralph Wiggum Showdown](./sources/video-ralph-wiggum-showdown/)).

**Cybernetic diagnosis:** Missing the comparator reset. In cybernetic terms, context rotation is variety injection -- restoring the controller's full requisite variety by clearing accumulated noise. Without rotation, the controller's variety decreases each iteration while environmental variety (codebase complexity) stays constant. This violates Ashby's Law of Requisite Variety: the controller can no longer absorb the variety it needs to manage.

### ralph-orchestrator (mikeyobrien)

**Source:** [mikeyobrien/ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator)

A Rust-based multi-backend orchestration framework (7 Cargo crates) implementing the most faithful interpretation of the Ralph pattern: true fresh context per iteration via new CLI processes.

**What it gets right:**

- Fresh context each iteration (new CLI process)
- Strongest backpressure in the ecosystem: tests + linter + type checker must all pass
- Hat system provides structured role decomposition (DebugHat, TestHat, ImplementationHat)
- Multi-backend support (7+ backends: Claude Code, Gemini CLI, Kiro, Codex, Copilot CLI, Amp, OpenCode)
- 31 presets covering most development workflows
- Persistent memory system stores learned patterns across iterations

**What it adds beyond Ralph:** The Hat system is a variety management mechanism -- specialized personas that decompose environmental complexity into focused roles while maintaining a single event bus for coordination. The 31 presets are pre-configured variety templates that match controller variety to common task types.

**Cybernetic diagnosis:** Good variety management through role decomposition and multi-backend routing. Limited self-modification -- the system learns across iterations but does not modify its own constraints (no autopoiesis). The persistent memory is external state (cybernetically sound), but it accumulates without pruning (potential for noise).

### Ralph TUI (subsy)

**Source:** [subsy/ralph-tui](https://github.com/subsy/ralph-tui)

A Bun-based terminal UI orchestrator emphasizing task dependency management and visual monitoring.

**What it gets right:**

- Sophisticated dependency system (DAG resolution with prerequisites, blockers, metadata)
- Real-time visual monitoring via TUI with subagent tracing
- Remote instance management via WebSocket
- Session persistence with crash recovery
- Built-in sandboxing (bwrap on Linux, sandbox-exec on macOS)
- Multi-agent support (6+ agents)

**What it adds beyond Ralph:** The dependency-aware scheduling is a coordination mechanism (Stafford Beer's System 2 in the Viable System Model) that existing Ralph implementations lack. Task dependencies encode structural relationships in the work, preventing the orchestrator from assigning work that depends on incomplete prerequisites.

**Cybernetic diagnosis:** Good orchestration variety through dependency tracking. Limited feedback integration -- no enforced test/lint/typecheck gating (no backpressure). Context is fresh per task, but within a task, context may accumulate. No guardrail learning mechanism.

### Key Gap Across All Implementations

None of these implementations apply cybernetics theory explicitly:

| Cybernetic Capability | Anthropic Plugin | ralph-orchestrator | Ralph TUI | Our Innovation |
|----------------------|------------------|--------------------|-----------|----------------|
| **Variety monitoring (Ashby's Law)** | No | Implicit (Hat routing) | No | Explicit tracking with thresholds |
| **Damping (speed limit)** | No (iteration count only) | No | No | Adaptive damping based on feedback quality |
| **Eigenform detection** | No | No | No | Pattern recognition for stuck vs productive states |
| **Autopoiesis (self-modifying constraints)** | No | Limited (memory) | No | Automatic guardrail generation from failure patterns |
| **Context rotation** | No (single session) | Yes (CLI process) | Per-task | Task-based delegation with fresh 200K windows |
| **External comparator** | Partial (promise match) | Yes (tests/lint/typecheck) | No | Objective verification + LLM-as-judge for subjective criteria |

This is where our plugin innovates: applying cybernetic theory to make these capabilities explicit, measurable, and architecturally enforced.

## Cybernetic Design Principles for Plugin Architecture

Each principle below maps a cybernetics concept to a concrete plugin mechanism, grounded in the theory from [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md) and the failure modes documented in [FAILURE-MODES.md](./FAILURE-MODES.md).

### Principle 1: Externalize the Comparator

Ralph's core cybernetic insight is that the controller is the environment, not the agent. The LLM is the effector (high bandwidth for code generation) but a poor comparator (unreliable self-assessment). The environment -- files, tests, git, Stop Hooks -- provides the control loop.

> "Ralph Loop breaks the limitations of relying on the LLM's self-assessment. [...] This pattern is essentially mandatory; it does not depend on the agent's subjective judgment but on external verification." -- [ReAct to Ralph Loop](./sources/blog-react-to-ralph-loop/)

**Plugin implication:** Hooks should delegate judgment to external tools, not LLM self-assessment. PostToolUse hooks that check tool output against objective criteria (test results, build status, lint output) and use `decision: "block"` to force continuation are cybernetically sound. The governor plugin's observe-compare-correct loop is a working example of this pattern.

**Improvement over Anthropic's plugin:** Use multi-layered objective verification (tests + build + lint + type check), not just completion promise string matching. The completion promise is a necessary signal, but it is not sufficient -- the promise confirms the agent *believes* it is done, not that it actually *is* done.

### Principle 2: Manage Variety (Ashby's Law)

> "Only variety can absorb variety." -- W. Ross Ashby

A controller must have at least as much variety (range of possible states) as the system it controls. In the Ralph Loop, this means the plugin's capacity to handle different situations must match the codebase's complexity.

**Variety amplification mechanisms:**

- Subagent spawning: up to 500 parallel subagents for searching/reading (massive exploration variety)
- Task-based delegation: fresh 200K context windows for each work unit
- Multi-model routing: haiku for mechanical tasks, sonnet for standard work, opus for complex reasoning

**Variety attenuation mechanisms:**

- Compaction: distill context to essential state (end goal, approach, steps, current state, next steps)
- Guardrails: constrain the agent's action space to prevent scope drift
- Focused prompts: narrow the agent's attention to one task per iteration

**Plugin implication:** Monitor variety balance and trigger interventions at thresholds. When context utilization crosses 60%, the controller's effective variety is declining. When it crosses 80%, force rotation. When a gutter pattern is detected (same command fails 3 times, file thrashing), variety has collapsed -- force fresh context.

**Improvement over all implementations:** No existing implementation tracks variety explicitly. The governor plugin could be enhanced to measure context utilization, count unique tool invocations per iteration, and detect variety collapse patterns (repeated identical actions).

### Principle 3: Implement Damping

Damping prevents oscillation -- it ensures the system converges on its goal rather than overshooting and overcorrecting indefinitely.

> "The rate at which you can get feedback is your speed limit. Never outrun your headlights." -- [Pocock, AI Hero](./sources/blog-tips-for-ai-coding-ralph/)

In control theory, this is the sampling theorem applied to feedback systems. If the controller acts faster than the sensor can measure, the system becomes unstable. Pocock's "speed limit" is a damping strategy: smaller changes produce faster feedback cycles, keeping the system well within its stability envelope.

**Plugin implication:** Rate-limit iterations based on feedback quality, not just iteration count. Current implementations cap iterations (`--max-iterations`), which is a crude damping mechanism. Cybernetics suggests damping based on the feedback signal quality:

| Feedback Signal | Damping Response |
|----------------|-----------------|
| All tests pass, clean lint | Low damping -- iterate freely |
| Some tests fail | Medium damping -- focus on failures before new work |
| Build broken | High damping -- block all new work until build restored |
| Gutter detected (3x-fail, thrashing) | Maximum damping -- force context rotation |

**Improvement over all implementations:** Current implementations cap iterations; cybernetics caps feedback rate. A damping-aware plugin would slow down when feedback quality degrades, not just when a counter reaches a threshold. See also the Ultrastable Iteration enhancement in [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#ultrastable-iteration) for an Ashby-inspired approach where the system switches strategy rather than merely slowing down, and the Double Bind Detector enhancement in [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#double-bind-detector) for detecting contradictory constraints that cause oscillation no amount of damping can resolve.

### Principle 4: Enable Autopoiesis (Self-Modification)

Autopoiesis -- self-producing systems that maintain their own organization through their own operations -- appears in the Ralph Loop as guardrail learning. When the agent fails in a specific way, the response is to add a "sign" that future iterations can discover.

> "Future iterations read these guardrails first and follow them, preventing repeated mistakes. It's a simple but effective form of agent memory across context rotations." -- [Year of the Ralph Loop Agent](./sources/blog-year-of-ralph-loop-agent/)

The Cursor implementation's `guardrails.md` is a concrete eigenform generator: each failure produces a constraint that subsequent iterations reproduce.

**Plugin implication:** A plugin that detects repeated failure patterns, automatically generates guardrails, and self-modifies its constraints based on accumulated experience implements second-order cybernetics -- observing its own observation. This is beyond what any current implementation does.

**Improvement over all implementations:** No existing implementation has self-modifying constraints. They have persistent memory (ralph-orchestrator) and guardrail files (Cursor plugin), but the constraint generation is manual. An autopoietic plugin would close the loop: detect pattern, generate guardrail, load guardrail in future iterations, verify guardrail effectiveness, retire ineffective guardrails.

### Principle 5: Fresh Context via Task Spawning

The original Ralph innovation that Anthropic's plugin misses. Context rotation is variety injection -- a fresh context window restores full controller variety.

Claude Code's Task tool provides what the original Ralph bash loop provides -- **fresh context per work unit** -- but from within a Claude Code session. Each spawned Task receives a fresh 200K token context window, completely isolated from the parent and from sibling Tasks. For full mechanics, see [TASK-SPAWNING-GUIDE.md](../task-spawning/TASK-SPAWNING-GUIDE.md).

**How to implement context rotation:**

- **Primary mechanism:** Commands and skills instruct Claude to spawn Tasks with fresh 200K context windows for each work unit, keeping the orchestrator session lean
- **Deep nesting:** Task workers can invoke `Bash(claude -p ...)` for deeper fresh-context nesting -- each invocation is a new OS process with genuinely fresh context (see [NESTED-CONTEXT-RESEARCH.md](../task-spawning/NESTED-CONTEXT-RESEARCH.md))
- **Architecture:** The orchestrator session stays lean (iteration management only); all real work is delegated to Tasks

**Which plugin components can trigger Task spawning:**

| Component | Can Trigger Tasks? | Mechanism |
|-----------|-------------------|-----------|
| Commands (slash commands) | Yes | Command markdown instructs Claude; Claude uses Task tool |
| Skills | Yes | Skill SKILL.md instructs Claude; Claude uses Task tool |
| Agents (.claude/agents/) | No | Custom subagents get their own fresh context but cannot spawn Tasks |
| Hooks | No | Hooks are Node.js/bash scripts returning JSON, not Claude interactions |

**Limitation to document:** The orchestrator (main session) still accumulates context. Task workers get fresh context, and can delegate further via `Bash(claude -p ...)` for nested fresh context -- but the main session itself is never rotated. Only delegated work benefits from context freshness.

**Cost model:** 20K tokens per Task (unavoidable overhead: system prompt + tool definitions). Each `Bash(claude -p ...)` incurs its own ~20K token overhead. Batch related operations: 1 Task reading 10 files is better than 10 Tasks reading 1 file each. Route by complexity: haiku for mechanical tasks, sonnet for standard work, opus for complex reasoning.

## Pattern-to-Plugin Mapping

This table maps Ralph patterns to their cybernetic roles, existing implementations, and the innovations this guide proposes. Each row is grounded in specific analysis from the knowledge base.

| Ralph Pattern | Cybernetic Role | Existing Implementations | Our Innovation |
|---------------|----------------|--------------------------|----------------|
| Stop Hook | Comparator | Anthropic: same-session promise matching | Genuine context rotation + multi-layered external verification |
| Backpressure | Negative feedback | ralph-orchestrator: tests + lint + typecheck gates | Adaptive damping based on feedback signal quality |
| Guardrails | Variety attenuator / hysteresis | Cursor plugin: `guardrails.md` with manual entries | Autopoietic constraint generation from detected failure patterns |
| Context rotation | Homeostasis / variety injection | Only bash loop and ralph-orchestrator do this | Task-based delegation: fresh 200K windows for work units; orchestrator stays lean |
| Gutter detection | Pathology sensor / System 3* audit | Cursor plugin: 3x-fail + file thrashing detection | Eigenform detection + automatic recovery + pattern classification |
| Subagent orchestration | Variety amplification (Ashby's Law) | All: limited to model-specific patterns | Monitored variety with explicit Ashby tracking and threshold interventions |
| AGENTS.md updates | Teachback / eigenform production | All: manual operational learnings | Automated operational learning extraction from iteration analysis |

Sources: [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md) for cybernetic roles, [ALTERNATIVES.md](./ALTERNATIVES.md) for implementation comparison, [FAILURE-MODES.md](./FAILURE-MODES.md) for gutter detection patterns.

## Plugin Architecture Concepts

The following plugin concepts extend the governor plugin's first-order cybernetic feedback (observe-compare-correct) with higher-order capabilities.

### Governor Enhancement (extend lz-cybernetics.governor)

The existing governor plugin implements PreToolUse and PostToolUse hooks with schema validation, invariant checking, oscillation detection, and structured error vectors. Enhancements suggested by the cybernetics analysis:

- **POSIWID analysis:** Monitor what the system actually does (files changed, tools invoked) vs what it was asked to do. Flag divergence between stated task and actual behavior. This is Stafford Beer's System 3* audit function -- sporadic monitoring that catches drift the regular control loop misses.
- **Eigenform detection:** Recognize when the agent is in a stable productive pattern (eigenform) vs a stable but unproductive attractor (stuck). Productive patterns: consistent test-pass-commit cycles, focused file edits. Stuck patterns: repeated identical tool calls, edit-revert cycles, growing diff with no test improvement.
- **Adaptive damping:** Adjust the feedback intervention rate based on convergence signals. When the agent is converging (tests improving, lint errors decreasing), reduce intervention frequency. When diverging (regression detected), increase it. This prevents the governor from becoming noise during productive work.
- **Variety monitoring:** Track effective context utilization as a proxy for controller variety. Warn at 60% utilization, escalate at 80%, force rotation beyond 80%. This operationalizes Ashby's Law as a runtime measurement.

### Backpressure Plugin

A plugin implementing Ralph's backpressure architecture as cybernetic negative feedback:

- **Upstream steering (PreToolUse):** Validate that the operational guide (Ralph's AGENTS.md or equivalent) contains required commands (test, lint, build) before allowing iterations to proceed. This ensures the feedback loop has functional sensors.
- **Downstream steering (PostToolUse):** Check tool output for build/test failures and inject corrective instructions via `decision: "block"` with specific remediation guidance. The governor plugin already demonstrates this pattern with its error vectors.
- **Acceptance-driven gates:** Derive test requirements from specification files during the planning phase. Verify those tests exist before allowing commits. This connects System 5 (specifications) through System 3 (control) to System 1 (operations).
- **Non-deterministic gates (System 3*):** LLM-as-judge evaluation for subjective criteria (creative quality, UX feel, code clarity). Binary pass/fail with configurable pass thresholds. Non-deterministic by nature -- the same work may pass or fail different audits -- but converges through iteration.

See also the Algedonic Channel enhancement in [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#algedonic-channel) for an emergency bypass that escalates catastrophic failures (all tests failing, security vulnerabilities) past normal backpressure into immediate loop ejection, and the Redundancy Audit enhancement in [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#redundancy-audit) for ensuring that backpressure gates have overlapping coverage so no failure class goes undetected.

### Context Rotation Plugin

The most architecturally significant concept -- implementing genuine context rotation within a Claude Code plugin:

- **Token budget monitoring via hooks:** Track context utilization through tool call history size and response complexity. Tiered thresholds: healthy (<60%), warning (60-80%), critical (>80%).
- **Automatic compaction triggers:** When approaching warning threshold, instruct Claude to externalize current state to files before context degrades. Compaction artifacts should include: end goal, approach, completed steps, current state, next steps.
- **Session handoff with state preservation:** Use `.claude/*.local.md` files with YAML frontmatter for structured state that survives context boundaries.
- **Primary mechanism -- Task-based context delegation:** Commands and skills instruct Claude to spawn Tasks with fresh 200K context windows for each work unit, keeping the orchestrator session lean.
- **Deep nesting via `Bash(claude -p ...)`:** Task workers can invoke the Claude CLI to spawn sub-sessions with genuinely fresh context (new OS process per invocation), enabling multi-level delegation.

**Hybrid architecture:**

```
Stop Hook (iteration lifecycle)
  +-- Orchestrator Session (lean: reads state, dispatches)
        +-- Task Worker (fresh 200K: standard work)
        +-- Task Worker (fresh 200K: complex sub-orchestration)
              +-- Bash(claude -p ...) (fresh context: sub-task A)
              +-- Bash(claude -p ...) (fresh context: sub-task B)
```

**Nesting depth options:**

- **1 level:** Orchestrator -> Task Worker (standard; managed by Claude Code)
- **2+ levels:** Orchestrator -> Task Worker -> `Bash(claude -p ...)` (unmanaged; requires own safeguards)
- **Unlimited:** Each `claude -p` can invoke further `claude -p` (requires depth guards, timeouts)

**Limitation:** The orchestrator (main session) still accumulates context. Task workers get fresh context, and can delegate further via `Bash(claude -p ...)` -- but the main session itself is never rotated. Only delegated work benefits from context freshness. See also the Channel Capacity Monitor enhancement in [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#channel-capacity-monitor) for a principled SNR-based approach to tracking context quality degradation, and the Structural Context Engineering enhancement in [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#structural-context-engineering) for designing context payloads that match the agent's structural coupling constraints rather than merely staying within token budgets.

**Cost tradeoff:** 20K token overhead per Task; each `Bash(claude -p ...)` incurs its own system prompt overhead (~20K tokens). Batch related work to amortize overhead -- 1 Task reading 10 files is better than 10 Tasks reading 1 file each.

**Safety:** `Bash(claude -p ...)` requires depth limits, timeouts, and `--no-session-persistence`. On subscription plans (Team, Pro, Max), nested invocations consume the shared usage pool without requiring separate API credits -- use depth limits and timeouts as safeguards. See [NESTED-CONTEXT-RESEARCH.md](../task-spawning/NESTED-CONTEXT-RESEARCH.md) for detailed risks and mitigations.

### Autopoietic Learning Plugin

A plugin that embodies second-order cybernetics -- observing its own observation:

- **Failure pattern storage:** Detect repeated failure patterns across sessions and store them in a structured format (e.g., `guardrails.md` with trigger, instruction, and origin metadata).
- **Automatic constraint generation:** When the same failure pattern is detected N times, automatically generate a guardrail entry that future iterations can discover.
- **Self-modifying constraints:** Periodically evaluate guardrail effectiveness by tracking whether the failure pattern recurs after the guardrail was added. Retire ineffective guardrails to prevent constraint accumulation.
- **Cross-session learning:** Use persistent state files (`.claude/*.local.md`) to carry learned patterns across session boundaries. This implements the "tune like a guitar" philosophy programmatically. See also the Learning Level Tracker enhancement in [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#learning-level-tracker) for classifying guardrail learning by Bateson's hierarchy -- distinguishing mechanical rule-following (Learning I) from genuine adaptation of learning strategies (Learning II).

### VSM Dashboard (Viable System Model Visualization)

Visualize the coding session as a viable system using Stafford Beer's model. Each system level maps to a concrete observable:

| VSM System | Function | Observable |
|------------|----------|------------|
| **System 1** (Operations) | Current task execution | Active tool calls, file edits in progress |
| **System 2** (Coordination) | Task scheduling | `IMPLEMENTATION_PLAN.md` status, task dependency state |
| **System 3** (Control) | Quality gates | Last test/lint/build results, pass/fail counts |
| **System 3*** (Audit) | Sporadic monitoring | Context utilization percentage, gutter detection alerts |
| **System 4** (Intelligence) | Environmental awareness | Spec-vs-code gap analysis, new requirements detection |
| **System 5** (Identity) | Goal alignment | JTBD completion percentage, acceptance criteria status |

This concept extends the governor plugin's correction feedback into a comprehensive system health view. The dashboard does not need to be visual -- it could be a structured state file that Claude reads each iteration, providing System 3* audit information as part of the context.

## Task-Based Context Rotation Architecture

This section provides the detailed architecture for context rotation using Claude Code's Task tool. For the underlying mechanics, see [TASK-SPAWNING-GUIDE.md](../task-spawning/TASK-SPAWNING-GUIDE.md).

### The Insight

The Task tool provides what the original Ralph bash loop provides -- fresh context per work unit -- but from WITHIN a Claude Code session. This is the mechanism that makes plugin-native context rotation feasible without requiring an external bash loop.

### Architecture: Lean Orchestrator + Fresh-Context Workers

```
Stop Hook (iteration lifecycle)
  +-- Orchestrator Session (lean: only reads state file, dispatches)
        +-- Task Worker 1 (fresh 200K: implement feature A)
        |     +-- Bash(claude -p ...) (fresh context: complex sub-task)
        +-- Task Worker 2 (fresh 200K: run tests)
        +-- Task Worker 3 (fresh 200K: code review)
              +-- Results written to files/git (persistent state)
```

The orchestrator session stays as lean as possible -- it reads the state file, decides what to dispatch, spawns Tasks, collects results, and updates the state file. All substantive work (implementation, testing, review) happens in fresh-context Task workers.

### How Plugin Components Interact with Tasks

| Component | Can Trigger Tasks? | Mechanism |
|-----------|-------------------|-----------|
| Commands | Yes | Command markdown instructs Claude; Claude uses Task tool |
| Skills | Yes | Skill SKILL.md instructs Claude; Claude uses Task tool |
| Agents | No (but get fresh context themselves) | Custom subagents in `.claude/agents/` are already fresh-context |
| Hooks | No | Hooks are Node.js/bash scripts returning JSON, not Claude interactions |

### Cost Model

| Aspect | Cost |
|--------|------|
| Per-Task overhead | ~20K tokens (non-negotiable: system prompt + tool definitions) |
| Per-`Bash(claude -p)` overhead | ~20K tokens (independent system prompt per OS process) |
| Multi-agent multiplier | 3-4x total tokens vs single-threaded equivalent |

**Optimization strategies:**

- Batch related operations: 1 Task reading 10 files is better than 10 Tasks reading 1 file each
- Route by complexity: haiku for mechanical tasks (file reads, pattern searches), sonnet for standard work (code analysis, implementation), opus for complex reasoning (architectural decisions)
- Group by expected duration: avoid mixing fast and slow operations in the same batch (slowest Task determines batch wall-clock time)

### Limitations

- **Orchestrator session still accumulates context** -- not rotated by Task tool alone
- **Tasks cannot spawn child Tasks via the Task tool** -- by design ([#4182](https://github.com/anthropics/claude-code/issues/4182)); however, `Bash(claude -p ...)` achieves nested fresh context by spawning a new OS process
- **`Bash(claude -p ...)` trades observability for depth:** Claude Code does not track nested CLI processes (no progress indicators, no result integration)
- **`Bash(claude -p ...)` requires explicit safeguards:** depth limits, `--no-session-persistence`, and timeouts. On subscription plans, `--max-budget-usd` is not meaningful -- use depth limits and timeouts instead
- **Batch execution only:** Claude waits for entire batch; no dynamic queue draining
- **Result truncation:** Large Task results may be summarized when returned to parent (Task tool only; `claude -p` returns full stdout)
- **Concurrency cap:** Maximum 7-10 concurrent Tasks

### Comparison: Ralph Bash Loop vs Task-Based vs Hybrid (Task + Bash CLI)

| Aspect | Bash Loop Ralph | Task-Based Plugin | Hybrid: Task + `Bash(claude -p)` |
|--------|----------------|-------------------|----------------------------------|
| Orchestrator context | Fresh each iteration (new CLI session) | Accumulates (same session) | Accumulates (same session) |
| Worker context | N/A (single session) | Fresh 200K per Task | Fresh 200K per Task |
| Sub-worker context | N/A | Not possible (no nesting) | Fresh per `claude -p` invocation |
| State persistence | Files + git | Files + git (same) | Files + git (same) |
| Iteration control | Bash script + AGENTS.md | Stop hook + state file | Stop hook + state file |
| Parallelism | One session at a time | Up to 7-10 concurrent Tasks | Tasks parallel; `claude -p` sequential per Task |
| Cost | 1 session per iteration | ~20K overhead per Task | ~20K per Task + ~20K per `claude -p` |
| Observability | External logging | Claude Code tracks Tasks | Must implement own logging for nested CLI |
| Nesting depth | Unlimited (external loop) | 1 level only | Unlimited (with depth guards) |

## Claude Code Plugin Mechanisms Reference

This section maps the cybernetic patterns above to concrete Claude Code plugin infrastructure. For full plugin development guidance, use the `plugin-dev` skills. For the repository's plugin conventions, see the repository AGENTS.md.

| Mechanism | Plugin Infrastructure | Example |
|-----------|----------------------|---------|
| Stop hooks | `hooks.json` with `Stop` event | Anthropic plugin: intercept exit, check for `<promise>` tag |
| PostToolUse feedback | `hooks.json` with `PostToolUse` event | Governor plugin: `decision: "block"` with error vector |
| PreToolUse validation | `hooks.json` with `PreToolUse` event | Governor plugin: schema validation before execution |
| State persistence | `.claude/*.local.md` with YAML frontmatter | Iteration count, completion status, variety metrics |
| Slash commands | Command markdown files with `allowed-tools` | Dispatch commands that instruct Claude to spawn Tasks |
| Skill instructions | `SKILL.md` in skills directory | Skills that guide Claude through Task-based workflows |
| Task spawning | Task tool with `subagent_type`, `model`, `run_in_background` | See [TASK-SPAWNING-GUIDE.md](../task-spawning/TASK-SPAWNING-GUIDE.md) |

## Key Insights for Plugin Architecture

These insights synthesize the cybernetics analysis with the implementation survey. Each is grounded in specific theoretical principles and empirical observations.

1. **Negative feedback is essential.** Without verification loops, agents drift. Every plugin that enables autonomous operation MUST include a comparator mechanism. The Stop Hook pattern -- external, binary, non-negotiable -- is the gold standard. See [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#the-stop-hook-as-comparator).

2. **Variety must match.** Plugin complexity should match environmental complexity. A simple project needs simple guardrails; a complex codebase needs massive subagent variety amplification. Plugins should scale their variety injection to match the task. See [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#requisite-variety-ashbys-law).

3. **Damping prevents pathology.** Guardrails, limits, and hysteresis are cybernetic necessities, not optional conveniences. The "speed limit" principle -- never outrun your headlights -- should be enforced architecturally, not merely advised. See [FAILURE-MODES.md](./FAILURE-MODES.md#behavioral-failures).

4. **Externalize the comparator.** Never let the effector evaluate its own output. Tests, builds, lints, and Stop Hooks are independent comparators. A plugin architecture that centralizes comparison in the agent is cybernetically unsound. See [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#moving-the-comparator-outside-the-effector).

5. **State belongs in the environment.** Git as memory is cybernetically sound. Files as state are cybernetically sound. The LLM's context window as state is cybernetically fragile. Plugins should persist all critical state outside the context window. See [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#external-state-as-cybernetic-memory).

6. **Fresh context equals variety injection.** Context rotation restores requisite variety. Plugins should detect context degradation and trigger rotation rather than allowing the agent to continue in the "dumb zone." Task-based delegation provides this mechanism from within a plugin session. See [TASK-SPAWNING-GUIDE.md](../task-spawning/TASK-SPAWNING-GUIDE.md#ralph-style-context-rotation-via-tasks).

7. **The disposable plan.** Models of the system should be cheap to regenerate. A plugin that makes it easy to regenerate the implementation plan from specs has more cybernetic value than a plugin that tries to keep a stale plan alive. Regeneration cost is one planning loop -- cheap compared to the agent going in circles. See [FAILURE-MODES.md](./FAILURE-MODES.md#plan-rigidity). See also the Good Regulator Maintenance enhancement in [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#good-regulator-maintenance) for a principled approach grounded in the Conant-Ashby theorem: every good regulator must be a model of its system, so stale plans provably degrade regulation quality.

8. **POSIWID reveals truth.** Monitor what the system actually does, not what it says it's doing. A System 3* audit function that tracks actual behavior provides the transparency that most agent systems lack entirely. See [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#posiwid).

## Sources and References

### Knowledge Base Documents

- [OVERVIEW.md](./OVERVIEW.md) -- Ralph Loop conceptual foundation
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) -- Technical implementation patterns, prompt templates, loop scripts
- [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md) -- Cybernetic theory applied to Ralph (first-order, second-order, VSM)
- [FAILURE-MODES.md](./FAILURE-MODES.md) -- Failure patterns, gutter detection, context rot
- [ALTERNATIVES.md](./ALTERNATIVES.md) -- Implementation comparison, agentic coding landscape
- [TASK-SPAWNING-GUIDE.md](../task-spawning/TASK-SPAWNING-GUIDE.md) -- Task tool mechanics, context isolation, parallel execution
- [NESTED-CONTEXT-RESEARCH.md](../task-spawning/NESTED-CONTEXT-RESEARCH.md) -- Bash(claude -p) nesting capability, risks, and mitigations

### External Implementations

- [Anthropic ralph-loop plugin](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/ralph-loop)
- [ralph-orchestrator](https://github.com/mikeyobrien/ralph-orchestrator) -- Mike O'Brien
- [Ralph TUI](https://github.com/subsy/ralph-tui) -- subsy
- [ralph-wiggum-cursor](https://github.com/agrimsingh/ralph-wiggum-cursor) -- Agrim Singh

### Prior Art in This Repository

- [lz-cybernetics.governor](../../plugins/lz-cybernetics.governor/) -- First-order cybernetic feedback plugin (observe-compare-correct)

### Primary Source Material

- [A Brief History of Ralph](./sources/blog-brief-history-of-ralph/) -- Dex Horthy
- [Everything is a Ralph Loop](./sources/blog-everything-is-a-ralph-loop/) -- Geoffrey Huntley
- [From ReAct to Ralph Loop](./sources/blog-react-to-ralph-loop/) -- DanKun, Alibaba Cloud
- [11 Tips for AI Coding with Ralph Wiggum](./sources/blog-tips-for-ai-coding-ralph/) -- Matt Pocock
- [2026: The Year of the Ralph Loop Agent](./sources/blog-year-of-ralph-loop-agent/) -- Alexander Gekov
- [Ralph Wiggum Showdown](./sources/video-ralph-wiggum-showdown/) -- Dex Horthy, Geoffrey Huntley
- [Advanced Context Engineering for Coding Agents](./sources/blog-advanced-context-engineering/) -- Dex Horthy
