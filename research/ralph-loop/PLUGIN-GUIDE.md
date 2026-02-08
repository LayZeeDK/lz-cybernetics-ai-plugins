# Cybernetics-Inspired Plugin Design: Beyond Ralph

This document is a design guide for building Claude Code plugins that improve on the Ralph Loop using Cybernetics theory. It is not a translation guide -- it is an innovation guide. Where existing implementations replicate Ralph's mechanics, this document uses cybernetic analysis to identify what they get wrong and proposes architecturally sound alternatives.

**Prerequisites:** [OVERVIEW.md](./OVERVIEW.md) (Ralph concepts), [IMPLEMENTATION.md](./IMPLEMENTATION.md) (technical patterns), [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md) (theoretical framework).

**Prior art:** The [lz-cybernetics.governor](../../plugins/lz-cybernetics.governor/) plugin is an early proof of concept that validated first-order cybernetic feedback (observe-compare-correct) applied to Claude Code tool calls. It predates the Ralph Loop research and was originally scoped as a single monolithic "skill-verifier" -- before the cybernetics analysis expanded to cover variety management, autopoiesis, viable systems, ecological cybernetics, and context rotation. The governor's hook patterns (PreToolUse/PostToolUse, error vectors, oscillation detection) are validated techniques that inform the architecture below, but the plugin itself may be redesigned, decomposed, or absorbed into the new plugin family this guide proposes.

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
| **Ultrastable adaptation (Ashby)** | No | No | No | Detect limit cycles; trigger structural change (plan regeneration, prompt rotation) rather than more same-level iteration |
| **Black box verification (Ashby)** | No | No | No | All comparators observe environmental state (git diff, exit codes), never agent self-reports |
| **Good regulator maintenance (Conant-Ashby)** | No | No | No | Detect plan-reality divergence; trigger model regeneration when stale plans degrade regulation |
| **Channel capacity / SNR (Shannon)** | No | No | No | Track context signal-to-noise ratio; trigger rotation on SNR degradation, not just token count |
| **Ethical variety monitoring (Von Foerster)** | No | No | No | Track whether agent actions increase or decrease future choices; alert on variety decline even when tests pass |
| **Algedonic signals (Beer)** | No | No | No | Emergency bypass: eject from loop on catastrophic failure rather than iterating on existential threats |
| **Redundancy of potential command (Beer)** | Partial (tests only) | Partial (tests + lint + typecheck) | No | Verify feedback channel independence; detect correlated failures from shared specification blind spots |
| **Learning level diagnosis (Bateson)** | No | No | No | Classify iterations as L-I/L-II/L-III; detect L-I stagnation requiring L-II intervention |
| **Double bind detection (Bateson)** | No | No | No | Analyze constraint space for contradictions causing oscillation guardrails cannot fix |

This is where our plugin innovates: applying cybernetic theory to make these capabilities explicit, measurable, and architecturally enforced.

## The Helmsman: Plugin Identity

**Plugin name:** `lz-cybernetics.helmsman`

The word "cybernetics" comes from the Greek κυβερνήτης (*kybernetes*) -- "helmsman" or "steersman." Norbert Wiener chose this etymology deliberately when founding the field in 1948: a helmsman steers a ship by continuously observing the environment (waves, wind, heading), comparing against the desired course, and making corrective adjustments. The helmsman does not plan the entire voyage in advance and execute it blindly -- they steer iteratively, resetting their assessment with each wave.

This is exactly what the Ralph Loop does: iterate, observe external state, correct course, repeat with fresh context. The plugin name makes this connection explicit.

### RALPH: The Methodology

The community knows the pattern as "Ralph" (after the Simpsons character, via Dex Horthy's original naming). Rather than abandoning this recognizable name, we reinterpret it as a principled engineering term:

> **R**ecursive **A**daptive **L**oop with **P**rincipled **H**elmsmanship

Each word earns its place through cybernetics theory:

| Letter | Word | Cybernetic Grounding |
|--------|------|---------------------|
| **R** | Recursive | The feedback loop is self-referential: each iteration's output becomes the next iteration's input. This recursion is the structural basis of all cybernetic control -- Wiener's circular causality. |
| **A** | Adaptive | Not merely repeating, but adapting. Ashby's ultrastability (two-tier adaptation), Bateson's learning levels (L-I correction vs L-II strategy change), and autopoietic self-modification all describe different kinds of adaptation the loop can exhibit. |
| **L** | Loop | The negative feedback loop -- observe, compare, correct -- is the atomic unit of cybernetic control. Every capability in this guide (backpressure, damping, variety monitoring, context rotation) is a refinement of this fundamental loop structure. |
| **P** | Principled | Grounded in cybernetics theory, not ad hoc heuristics. Each design decision traces to a specific theorist and principle: Ashby's requisite variety, Beer's viable systems, Bateson's learning hierarchy, Shannon's channel capacity, Maturana's structural determinism. |
| **H** | Helmsmanship | The practice of steering by feedback -- κυβερνήτης in action. The helmsman metaphor captures what distinguishes this plugin from mechanical looping: situational awareness, adaptive response, and the judgment to know when to hold course versus when to change heading entirely. |

### From Meme to Method

The original Ralph Loop community adopted the name as self-deprecating humor -- "the dumbest thing that works." The RALPH backronym reframes it as "the most theoretically grounded thing that works." Both descriptions are simultaneously valid, which is itself a cybernetic observation: multiple valid descriptions of the same system coexist (a consequence of the observer-dependence that second-order cybernetics emphasizes).

The shift from pop-culture meme to principled methodology is not cosmetic. It changes what questions practitioners ask:

| Meme framing | Methodology framing |
|---|---|
| "Is it looping?" | "Is it adapting?" |
| "How many iterations?" | "What learning level is the current failure?" |
| "Is context full?" | "What is the signal-to-noise ratio?" |
| "Did it finish?" | "Did the comparator confirm convergence?" |
| "Make it loop longer" | "Inject variety or rotate context" |

### Discoverability

The plugin's `plugin.json` keywords should include both lineages for discoverability:

```json
{
  "keywords": [
    "cybernetics", "helmsman", "kybernetes",
    "ralph-loop", "ralph", "ralph-wiggum",
    "feedback-loop", "context-rotation", "backpressure",
    "variety", "adaptation", "autonomous-coding"
  ]
}
```

Anyone searching for "ralph loop plugin" finds the keywords. Anyone reading the documentation finds the cybernetics lineage. The RALPH backronym bridges both audiences.

## Cybernetic Design Principles for Plugin Architecture

Each principle below maps a cybernetics concept to a concrete plugin mechanism, grounded in the theory from [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md) and the failure modes documented in [FAILURE-MODES.md](./FAILURE-MODES.md).

### Principle 1: Externalize the Comparator

Ralph's core cybernetic insight is that the controller is the environment, not the agent. The LLM is the effector (high bandwidth for code generation) but a poor comparator (unreliable self-assessment). The environment -- files, tests, git, Stop Hooks -- provides the control loop.

> "Ralph Loop breaks the limitations of relying on the LLM's self-assessment. [...] This pattern is essentially mandatory; it does not depend on the agent's subjective judgment but on external verification." -- [ReAct to Ralph Loop](./sources/blog-react-to-ralph-loop/)

**Plugin implication:** Hooks should delegate judgment to external tools, not LLM self-assessment. PostToolUse hooks that check tool output against objective criteria (test results, build status, lint output) and use `decision: "block"` to force continuation are cybernetically sound. The governor prototype's observe-compare-correct loop validated this pattern.

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

**Improvement over all implementations:** No existing implementation tracks variety explicitly. The first-order feedback hooks (as prototyped in the governor) could be extended to measure context utilization, count unique tool invocations per iteration, and detect variety collapse patterns (repeated identical actions).

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

**Improvement over all implementations:** No existing implementation has self-modifying constraints. They have persistent memory (ralph-orchestrator) and guardrail files (Cursor plugin), but the constraint generation is manual. An autopoietic plugin would close the loop: detect pattern, generate guardrail, load guardrail in future iterations, verify guardrail effectiveness, retire ineffective guardrails. See also the Learning Level Tracker enhancement in [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#learning-level-tracker) for classifying this self-modification by Bateson's learning hierarchy -- the autopoietic constraint generation described here is a Learning II process (changing the strategy repertoire), distinct from the Learning I iteration it corrects.

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
| Plan regeneration | Good regulator maintenance (Conant-Ashby) | All: manual plan updates; Anthropic: disposable plan ethos | Good Regulator Maintenance: detect plan-reality divergence, auto-regenerate when model accuracy drops |
| Limit cycle / repeated failure | Ultrastable structural change (Ashby) | Cursor plugin: 3x-fail gutter detection (stops, doesn't restructure) | Ultrastable Iteration: detect limit cycles, trigger structural change (plan regen, prompt rotation, escalation) |
| Agent self-assessment | Black box methodology (Ashby) | All: trust agent's "done" assessment to varying degrees | Black Box Verification: observable-only comparators, claim-vs-evidence audit, no reliance on self-reports |
| Learning level mismatch | Learning pathology sensor (Bateson L-I/L-II) | None -- all treat iteration failure as same-level problem | Learning Level Tracker: classify failure recurrence as L-I stagnation, prescribe L-II intervention |
| Constraint contradiction | Double bind detector (Bateson 1956) | None -- all add more constraints to oscillation | Double Bind Detector: analyze constraint space, distinguish amnesiac from double-bind oscillation |

Sources: [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md) for cybernetic roles (first-order, second-order, management, ecological), [ALTERNATIVES.md](./ALTERNATIVES.md) for implementation comparison, [FAILURE-MODES.md](./FAILURE-MODES.md) for gutter detection patterns.

## Plugin Architecture Concepts

The following plugin concepts build on the first-order cybernetic feedback pattern (observe-compare-correct) validated by the governor prototype, adding higher-order capabilities from the expanded cybernetics analysis.

### First-Order Feedback Hooks

The governor prototype validated PreToolUse and PostToolUse hooks with schema validation, invariant checking, oscillation detection, and structured error vectors. Whether these capabilities are enhanced in place, decomposed into focused plugins, or absorbed into a larger architecture is a design decision for implementation. The cybernetics analysis suggests these higher-order additions:

- **POSIWID analysis:** Monitor what the system actually does (files changed, tools invoked) vs what it was asked to do. Flag divergence between stated task and actual behavior. This is Stafford Beer's System 3* audit function -- sporadic monitoring that catches drift the regular control loop misses.
- **Eigenform detection:** Recognize when the agent is in a stable productive pattern (eigenform) vs a stable but unproductive attractor (stuck). Productive patterns: consistent test-pass-commit cycles, focused file edits. Stuck patterns: repeated identical tool calls, edit-revert cycles, growing diff with no test improvement.
- **Adaptive damping:** Adjust the feedback intervention rate based on convergence signals. When the agent is converging (tests improving, lint errors decreasing), reduce intervention frequency. When diverging (regression detected), increase it. This prevents the feedback hooks from becoming noise during productive work.
- **Variety monitoring:** Track effective context utilization as a proxy for controller variety. Warn at 60% utilization, escalate at 80%, force rotation beyond 80%. This operationalizes Ashby's Law as a runtime measurement.

### Black Box Verification

A plugin implementing Ashby's black box methodology (1956) -- all control depends on observable environmental state, never on agent self-reports. The LLM is the definitive black box: its internal representations are unobservable during inference, and chain-of-thought output is itself a generated output, not a measurement of internals.

- **Observable-only comparators:** All hooks check environmental state (git diff, test exit codes, file existence) rather than interpreting agent output text. The Stop Hook's binary string match is the purest black box design: it observes only output, makes no assumptions about internal state.
- **Claim-vs-evidence audit:** Compare what the agent says it did (in output text) against what observably changed (file system state, git diff), flagging discrepancies as potential hallucination.
- **Binary comparators preferred:** Stop Hook pattern (exact string match) over fuzzy interpretation of agent "intent" or "confidence."
- **No reliance on chain-of-thought:** Treat thinking tokens as opaque black-box output, not as reliable internal state. Any control architecture that depends on the agent's self-reported "understanding" or "confidence" is cybernetically unsound.

See [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#black-box-verification) for the full enhancement specification and [The Black Box Methodology](./CYBERNETICS-ANALYSIS.md#the-black-box-methodology) for the underlying theory.

### Backpressure Plugin

A plugin implementing Ralph's backpressure architecture as cybernetic negative feedback:

- **Upstream steering (PreToolUse):** Validate that the operational guide (Ralph's AGENTS.md or equivalent) contains required commands (test, lint, build) before allowing iterations to proceed. This ensures the feedback loop has functional sensors.
- **Downstream steering (PostToolUse):** Check tool output for build/test failures and inject corrective instructions via `decision: "block"` with specific remediation guidance. The governor prototype validated this pattern with its error vectors.
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

### Ethical Variety Monitor

A plugin embodying von Foerster's ethical imperative (1973): "Act always so as to increase the number of choices." This evaluates agent actions beyond functional correctness -- an action that passes all tests but reduces future options is a net negative for system viability.

- **Variety tracking:** Monitor whether agent actions increase or decrease system variety over time. Tests (safety net for future changes), clear interfaces (composition possibilities), and deleted dead code (reduced confusion) increase variety. Hard-coded values, tight coupling, and suppressed lint rules decrease it.
- **Type safety trend:** Detect `any` type additions, type assertion increases, type system weakening -- each reduces the type checker's ability to catch future errors.
- **Coupling metrics:** Track whether dependencies between modules are increasing or decreasing; whether interfaces are narrowing (fewer choices) or widening (more choices).
- **Feedback channel health:** Detect lint rule suppressions, test skips, verification channel disabling -- each reduces a feedback channel, decreasing choices for all subsequent iterations.
- **Trend alerting:** Warn when cumulative variety is decreasing even if all tests pass -- the system may be "passing into fragility."

See [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#ethical-variety-monitor) for the full enhancement specification and [The Ethical Imperative](./CYBERNETICS-ANALYSIS.md#the-ethical-imperative) for the underlying theory.

### Learning Level Tracker

A plugin implementing Bateson's learning hierarchy (1972) -- classifying system behavior by learning level and prescribing the correct intervention type. The critical insight is that **Learning I cannot solve Learning II problems**: when the same failure *class* recurs across iterations, more iterations at the same level are futile.

- **Level classification:** Track whether the system is operating at L-I (iterative error correction within a fixed strategy), L-II (strategy repertoire change via guardrails/spec revision), or L-III (meta-level restructuring of the learning process itself).
- **L-I stagnation detection:** When the same failure *class* (not the same specific error) recurs across iterations, diagnose as an L-I problem requiring L-II intervention. This goes beyond the Governor Enhancement's eigenform detection -- it classifies *why* the agent is stuck, not just *that* it is stuck.
- **L-II event tracking:** Log guardrail additions, spec revisions, and prompt restructuring as Learning II events. Measure their effectiveness across subsequent iterations. Retire L-II interventions that don't reduce failure recurrence.
- **Intervention prescription:** When L-I stagnation is detected, suggest specific L-II actions (add guardrail, revise spec, restructure prompt) rather than allowing continued futile iteration.

See [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#learning-level-tracker) for the full enhancement specification and [Levels of Learning](./CYBERNETICS-ANALYSIS.md#levels-of-learning) for the underlying theory.

### Escalation Vocabulary

A plugin implementing a named escalation vocabulary for the Helmsman -- a structured progression from light intervention to loop ejection. This vocabulary maps directly to Bateson's learning hierarchy and provides actionable guidance for when to escalate beyond normal iteration.

**Escalation levels:**

| Level | Name | Learning Level | Description | Trigger Patterns |
|-------|------|----------------|-------------|-----------------|
| **E-0** | Patch | L-I | Targeted fix to specific error; stays within current strategy | Single test failure, lint error, type error; agent proceeds normally |
| **E-I** | Refactor | L-I → L-II boundary | Structural change to improve approach without changing strategy | 2x-fail on same error class; file thrashing detected; SNR degradation |
| **E-II** | Redesign | L-II | Fundamental strategy change -- new approach, spec revision, guardrail addition | 3x-fail (gutter); L-I stagnation detected; eigenform analysis confirms stuck state |
| **E-III** | Escalate to human | L-II → L-III boundary | Contradictory constraints or unclear goals require human judgment | Double bind detected; contradictory specs; priority conflict unresolvable by agent |
| **E-IV** | Eject from loop | Algedonic | Catastrophic failure -- all tests broken, security vulnerability, runaway cost | Algedonic signal (Beer); all-tests-failing; security scan alerts; budget threshold exceeded |

**Cybernetic grounding:**

- **E-0 through E-I** map to Ashby's ultrastability first-tier adaptation -- corrective adjustments within the current parameter space. The agent iterates normally; hooks provide guidance.
- **E-II** triggers Ashby's ultrastability second-tier adaptation -- restructuring the parameter space itself. The agent must change strategy, not merely correct within strategy. This is Bateson's L-II event: modifying the repertoire of possible behaviors.
- **E-III** recognizes the limits of autonomous adaptation. Double bind contradictions and L-III learning problems (changing the learning process itself) require human judgment. The agent cannot resolve meta-level conflicts without an external reference frame.
- **E-IV** implements Beer's algedonic channel -- the emergency bypass that distinguishes "needs another iteration" from "stop iterating, escalate immediately." Catastrophic failures demand loop termination, not continued iteration.

**Hook detection patterns:**

- **Gutter detection** (3x-fail, file thrashing) triggers E-II -- the agent is in a limit cycle requiring structural change, not more L-I iteration. See [FAILURE-MODES.md](./FAILURE-MODES.md#behavioral-failures).
- **Eigenform analysis** distinguishes productive patterns (stable convergence) from stuck attractors (stable oscillation), prescribing E-0/E-I for the former, E-II for the latter. See the First-Order Feedback Hooks concept in this document.
- **Double bind detection** triggers E-III -- contradictory constraints cannot be resolved by adding more guardrails. See the Double Bind Detector concept below.
- **Algedonic signals** trigger E-IV -- all-tests-failing, security vulnerabilities, runaway cost. See [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#algedonic-channel).
- **Context SNR degradation** triggers E-I/E-II depending on severity -- high noise degrades controller variety, requiring rotation. See [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#channel-capacity-monitor).
- **Learning level mismatch** (L-I stagnation) triggers E-II -- the agent needs a strategy change, not more iteration. See the Learning Level Tracker concept above.

**Escalation state persistence:**

To prevent escalation amnesia across context rotations, the escalation level is recorded in the state file (`.claude/*.local.md`) with YAML frontmatter:

```yaml
---
escalation_level: E-II
escalation_reason: "3x-fail detected on test suite; eigenform analysis confirms stuck state"
escalation_timestamp: 2026-02-08T14:32:00Z
last_successful_level: E-0
---
```

When a fresh context worker reads the state file, it inherits the current escalation level. This prevents the system from resetting to "patch" mode after a "redesign" was prescribed. The escalation level provides a memory mechanism that survives context boundaries -- a key requirement for autopoietic learning.

**Escalation decay:**

After successful completion at a higher escalation level (e.g., tests pass after E-II redesign), the system should gradually de-escalate rather than snap back to E-0. Decay schedule:

- **E-IV → E-0**: Immediate reset after human intervention resolves the catastrophic failure
- **E-III → E-II**: After human clarifies constraints, attempt autonomous redesign before returning to normal iteration
- **E-II → E-I**: After 2 successful iterations at E-II level (no failures), de-escalate to refactor mode
- **E-I → E-0**: After 3 successful iterations at E-I level (clean tests, no regressions), de-escalate to patch mode

This decay mechanism prevents premature de-escalation (snapping back to E-0 after a single success) while avoiding permanent high-alert mode. The decay thresholds are tunable based on project complexity and failure frequency.

**Plugin implementation:**

- **PostToolUse hook**: Analyze tool output for failure patterns, classify escalation level, update state file
- **PreToolUse hook**: Read current escalation level from state file, adjust allowed-tools and guidance accordingly
- **Stop hook**: Check escalation level; if E-IV, eject from loop rather than continuing iteration; if E-III, surface to human with diagnostic report

See [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md) for the theoretical foundations of each escalation level and [FAILURE-MODES.md](./FAILURE-MODES.md) for the failure patterns that trigger escalation.

### Double Bind Detector

A plugin implementing Bateson's double bind theory (1956) -- analyzing the constraint space for logical contradictions that cause oscillation no amount of guardrails can fix. This complements the first-order feedback hooks' oscillation detection: the hooks detect *that* oscillation is occurring; the Double Bind Detector diagnoses *why*.

- **Constraint extraction:** Parse specs, guardrails, and `AGENTS.md` for imperatives (must/must-not/should/should-not).
- **Contradiction detection:** Check for mutual exclusivity between constraints (e.g., "implement feature X" + "don't modify files outside scope" when X requires shared utility changes). Four contradiction types: scope, pattern, completeness, and priority conflicts.
- **Differential diagnosis:** When oscillation is detected, distinguish amnesiac oscillation (agent forgets failed approaches -- needs hysteresis/guardrails) from double-bind oscillation (constraints contradict each other -- needs constraint resolution). This is critical because adding guardrails to a double bind makes it *worse*.
- **Human-surfacing:** Present detected contradictions to the operator with the conflicting constraints and suggested resolution paths.

See [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#double-bind-detector) for the full enhancement specification and [The Double Bind](./CYBERNETICS-ANALYSIS.md#the-double-bind) for the underlying theory.

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

This concept extends the first-order correction feedback (as prototyped in the governor) into a comprehensive system health view. The dashboard does not need to be visual -- it could be a structured state file that Claude reads each iteration, providing System 3* audit information as part of the context.

### Initialization Protocol

Before the Helmsman can iterate autonomously, it must verify that the system has the prerequisites for cybernetic control: defined goals (System 5), functional comparators (System 3), and sufficient variety (controller capacity). This initialization protocol implements the transition from human conversation to autonomous iteration.

This is not a per-iteration concern -- the Per-Iteration Coordination Protocol handles ongoing operation -- but rather a one-time bootstrap that ensures the loop starts from a valid state. In [IMPLEMENTATION.md](./IMPLEMENTATION.md)'s three-phase workflow, initialization spans Phase 1 (Define Requirements) and Phase 2 (Planning), establishing the preconditions for Phase 3 (Iterative Execution).

**Initialization checklist for `/helmsman:start`:**

1. **Goal validation (System 5):** Read specification files (`specs/*.md` or equivalent). Verify at least one spec exists with explicit acceptance criteria. If missing, prompt the user to define them before proceeding. Without defined goals, the feedback loop has no reference signal -- the comparator cannot determine whether work is complete.

2. **Feedback channel verification (System 3):** Check that test, lint, and build commands exist in the project (package.json scripts, Makefile targets, or equivalent). These are the comparator mechanisms. Without them, the feedback loop has no sensor -- the Helmsman cannot verify progress objectively.

3. **Initial state file creation:** Create `.claude/helmsman.local.md` with initial YAML frontmatter (escalation_level: E-0, iteration_count: 0, variety_metrics: {}, etc.). This state file provides persistence across context rotations, storing the escalation level, variety tracking, and learned constraints.

4. **Guardrail loading (Autopoietic Learning):** Check for existing guardrail files from previous sessions (`guardrails.md` or equivalent). Load them into context if found. This restores the system's learned constraints, enabling autopoietic self-modification across session boundaries.

5. **Plan confirmation (HITL gate):** Present the user with: detected goals, available feedback channels, proposed first task. Wait for explicit confirmation before entering autonomous iteration. This human-in-the-loop gate ensures the operator has oversight before the Helmsman operates autonomously.

**Re-initialization after session breaks:**

When the Helmsman is resumed after a session break, the initialization protocol reads the existing state file instead of creating a new one. This restores escalation level, variety metrics, and learned constraints from the previous session. The guardrail loading step (4) ensures continuity across sessions -- the system remembers what it learned, implementing the "tune like a guitar" philosophy programmatically.

**Cross-references:**

- See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for the three-phase workflow (Phase 1: Define Requirements, Phase 2: Planning, Phase 3: Iterative Execution)
- See the Per-Iteration Coordination Protocol section below for the ongoing runtime flow after initialization completes
- See the Autopoietic Learning Plugin concept for guardrail persistence and self-modifying constraints

## Per-Iteration Coordination Protocol

The plugin concepts above -- First-Order Feedback Hooks, Black Box Verification, Backpressure Plugin, Context Rotation, Autopoietic Learning, Ethical Variety Monitor, Learning Level Tracker, Escalation Vocabulary, Double Bind Detector, VSM Dashboard -- are described independently, each grounded in a specific cybernetics principle. At runtime, however, they do not fire in isolation. They must execute in a defined sequence within each iteration to avoid conflicts, redundant computation, and inconsistent state.

This section defines the operational glue: a three-phase per-iteration protocol that sequences all Helmsman checks into a coherent runtime flow.

### Three-Phase Protocol

The Helmsman organizes checks by timing relative to the agent's work: before, during, and after. Each plugin concept maps to one or more checkpoints in this protocol.

| Phase | Checkpoint | Plugin Concept | Purpose |
|-------|-----------|----------------|---------|
| **Pre-iteration** | Read escalation state | Escalation Vocabulary | Load current escalation level from state file |
| | Check escalation level | Escalation Vocabulary | If E-IV, eject; if E-III, surface to human |
| | Check context utilization / SNR | Context Rotation / Channel Capacity | Verify controller variety is sufficient for iteration |
| | Load guardrails and learned constraints | Autopoietic Learning | Inject learned patterns into agent's behavioral repertoire |
| | Validate feedback channels exist | Backpressure | Ensure test/lint/build commands are present (upstream steering) |
| **Mid-iteration** | PreToolUse: validate tool use | Backpressure | Check tool invocation against current escalation level constraints |
| | PostToolUse: analyze tool output | First-Order Feedback Hooks | Detect failure patterns in tool output (exit codes, error messages) |
| | PostToolUse: classify failure by learning level | Learning Level Tracker | Distinguish L-I correction from L-II stagnation |
| | PostToolUse: check for oscillation | Double Bind Detector | Run differential diagnosis on repeated failures |
| | PostToolUse: update variety metrics | Ethical Variety Monitor | Track whether actions increase or decrease future choices |
| | PostToolUse: POSIWID audit | VSM Dashboard / System 3* | Compare stated task vs actual behavior (files changed, tools invoked) |
| **Post-iteration** | Black Box Verification | Black Box Verification | Claim-vs-evidence audit: git diff vs stated changes |
| | Acceptance gate (deterministic) | Backpressure | All objective comparators pass? (tests, lint, build, type check) |
| | Acceptance gate (non-deterministic) | Backpressure / System 3* | LLM-as-judge for subjective criteria (code clarity, UX quality) |
| | Update escalation level | Escalation Vocabulary | Adjust based on iteration outcome (success -> de-escalate; failure -> escalate) |
| | Update eigenform tracking | Autopoietic Learning | Detect new failure patterns; generate guardrails if pattern recurs |
| | Write updated state to state file | Context Rotation | Persist escalation level, variety metrics, eigenform observations |
| | Coordination decision | All concepts | Continue iteration / rotate context / escalate / eject |

### Coordination Decision Flowchart

After the post-iteration checks complete, the Helmsman makes a coordination decision that determines the next action. This decision integrates signals from all plugin concepts into a single routing choice.

```
[Post-Iteration Checks Complete]
         |
         v
   All gates pass?
         |
    Yes  |  No
         |   \
         v    v
    De-escalate   Classify learning level
    one level          |
    (with decay)       |
         |             v
         |        L-I correction needed?
         |             |
         |        Yes  |  No
         |             |   \
         v             v    v
    Continue     Continue    L-I stagnation detected?
    iteration    with             |
         ^       corrective   Yes  |  No
         |       guidance          |   \
         |            ^            v    v
         |            |       Escalate   Double bind detected?
         |            |       to E-II         |
         +------------+       (redesign)  Yes |  No
                                   ^          |   \
                                   |          v    v
                                   |     Escalate  Algedonic signal?
                                   |     to E-III       |
                                   |     (human)    Yes |  No
                                   |          ^         |   \
                                   +----------+         v    v
                                                   Escalate  Context
                                                   to E-IV   utilization
                                                   (eject)   > 80%?
                                                        ^         |
                                                        |    Yes  |  No
                                                        |         |   \
                                                        |         v    v
                                                        |    Force     Continue
                                                        |    context   iteration
                                                        |    rotation  (loop)
                                                        |         ^         ^
                                                        +---------+---------+
```

**Decision paths:**

- **All gates pass:** De-escalate one level using the decay schedule from the Escalation Vocabulary concept. Continue iteration at the new (lower) escalation level.
- **Deterministic gates fail:** Classify the failure by learning level using the Learning Level Tracker. If L-I correction is sufficient, continue with corrective guidance. If L-I stagnation is detected (same failure class recurs), escalate to E-II (redesign).
- **Double bind detected:** The Double Bind Detector identifies contradictory constraints in the specification. Escalate to E-III (human intervention required).
- **Algedonic signal:** The Backpressure Plugin or VSM Dashboard detects a catastrophic failure (all tests failing, security vulnerability). Escalate to E-IV (eject from loop).
- **Context utilization > 80%:** The Context Rotation Plugin detects SNR degradation or token budget exhaustion. Force context rotation before the next iteration.

### Design Rationale

An early exploration of cybernetics applied to the Ralph Loop proposed an Outer-Middle-Inner check sequence: Outer (goal alignment), Middle (variety/channel capacity), Inner (tool execution correctness). This conceptual layering inspired the Helmsman's architecture, but the plugin implementation organizes checks by timing rather than by conceptual layer.

**Why timing-based organization?** The Claude Code plugin system uses hooks that fire at specific tool-use events -- PreToolUse and PostToolUse are event-driven, not invoked by agent reasoning. The agent does not explicitly "think through three layers" sequentially; instead, hooks intercept tool calls at runtime and inject guidance. The Pre/Mid/Post structure matches this event-driven architecture.

**What the phases correspond to:**

- **Pre-iteration checks** ensure the agent starts in a valid state (escalation level appropriate, guardrails loaded, feedback channels functional). This prevents wasted iteration on unrecoverable conditions.
- **Mid-iteration checks** provide real-time steering during tool execution, catching failures as they occur and adjusting agent behavior dynamically. This is the first-order feedback loop in action.
- **Post-iteration checks** perform aggregate analysis across the entire iteration, comparing the agent's work against objective criteria and deciding whether to continue, escalate, or eject. This is the higher-order control loop.

The Outer-Middle-Inner conceptual model still applies -- the Pre/Mid/Post protocol *implements* those layers, but at the infrastructure level (hooks firing at defined events) rather than the reasoning level (agent thinking through a checklist).

### Task Spawning as Layer Implementation

The early exploration's three-layer model proposed named agents per layer (operational, strategy, goal). Without Task spawning, this required a single agent to reason through all three layers sequentially -- a design constrained by the single-context-window assumption.

With Task spawning (see the Task-Based Context Rotation Architecture section below), the conceptual layers become implementable as **fresh-context workers** rather than named agents:

| Conceptual Layer | Task Worker Role | Why Fresh Context Matters |
|------------------|-----------------|--------------------------|
| **Inner (operational)** | Implementation worker | Uncontaminated by previous failed approaches; operates with full 200K variety on the current task |
| **Middle (strategy)** | Meta-analysis worker | Reads iteration history from state files *without inheriting accumulated context bias*; can diagnose L-I stagnation patterns that the main session cannot see from within |
| **Outer (goal)** | Spec-vs-code gap analysis worker | Fresh comparison of specifications against current code state, free from the drift that accumulates during extended sessions |

**Key reinterpretations enabled by Task spawning:**

- **Strategy adjustment in fresh context:** When the Coordination Protocol prescribes an E-II (redesign) escalation, the redesign can happen in a fresh-context Task worker. The worker reads the state file (which records what failed and why) but does not inherit the biased context that led to the failure. This is a genuine L-II intervention -- the strategy change happens in a context uncontaminated by the failed strategy.
- **Attempt summarization as compaction:** A fresh-context worker that reads raw iteration logs and produces a compressed pattern summary implements the "compaction" that the Context Rotation Plugin describes. The summary becomes the state file content for the next iteration -- distilled to end goal, approach, completed steps, current state, and next steps.
- **Prompt/guardrail revision without bias:** Rewriting guardrails or revising specs from within the context that produced the failure is paradoxical -- the same biased context rewrites its own constraints. A fresh-context worker avoids this: it can analyze the failure pattern from state file evidence and produce revised constraints without inheriting the cognitive rut.
- **Orchestrator-worker state contract:** The structured output formats that the early exploration prescribed per layer (Goal Interpretation / Success Criteria for outer; Attempt Pattern Summary / Strategy Adjustment for middle; Test Feedback / Error Analysis for inner) map naturally to the **state file schema** that the orchestrator writes and Task workers read. They are not agent output formats -- they are the contract between coordinator and workers.

This reinterpretation does not add new plugin concepts. It connects the Per-Iteration Coordination Protocol (which sequences checks via hooks) to the Task-Based Context Rotation Architecture (which provides the fresh-context infrastructure), showing how the conceptual layers are implemented through both mechanisms working together: hooks for real-time mid-iteration steering, Task workers for fresh-context higher-order analysis.

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

9. **Learning levels determine intervention type.** Bateson's hierarchy predicts that Learning I (iterative error correction) cannot solve Learning II problems (inadequate strategy set). When the same failure *class* recurs across iterations, the intervention must target the strategy set (add guardrails, revise specs) rather than the specific error. Plugins should detect the learning level mismatch and prescribe the correct intervention. See [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#levels-of-learning).

10. **Contradictions in the constraint space cause oscillation that guardrails cannot fix.** Bateson's double bind reveals that some agent oscillation is caused by contradictory constraints, not by lack of memory. Adding guardrails to a double bind makes it worse. Plugins should distinguish amnesiac oscillation (needs hysteresis) from double-bind oscillation (needs constraint resolution) before prescribing treatment. See [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#the-double-bind).

11. **The black box demands external observation.** The LLM's internal state is unobservable. Any control architecture that depends on the agent's self-reported state -- confidence, understanding, completeness assessment -- is cybernetically unsound. Design all comparators to observe environmental state changes (git diff, exit codes, file existence), not agent self-reports. See [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#the-black-box-methodology).

12. **Track signal quality, not just quantity.** Shannon's channel capacity theorem predicts that context *quality* (signal-to-noise ratio) matters more than context *size* (utilization percentage). A 30% utilized context full of error logs is more degraded than a 70% context with clean state. Plugins should trigger rotation on SNR degradation, not merely token count. See [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#channel-capacity-and-the-context-window).

13. **Catastrophic failures need ejection, not iteration.** Beer's algedonic signals distinguish normal backpressure ("try again, tests failed") from existential threats ("stop trying, escalate"). All-tests-failing, security vulnerabilities, and runaway token spend require halting the loop, not another iteration. Plugins should implement an emergency bypass channel separate from normal feedback. See [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#algedonic-signals-the-emergency-bypass-channel).

14. **Context is structure, not information.** Maturana's structural determinism means loading files into context *reconfigures the agent's behavioral repertoire*, not merely "informs" it. Loading order matters -- specs before code produces a different agent than code before specs. Negative examples ("don't do X") activate the prohibited pattern. Plugins should enforce loading order and prefer positive phrasing in guardrails. See [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md#structural-determinism).

## Sources and References

### Knowledge Base Documents

- [OVERVIEW.md](./OVERVIEW.md) -- Ralph Loop conceptual foundation
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) -- Technical implementation patterns, prompt templates, loop scripts
- [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md) -- Cybernetic theory applied to Ralph (first-order, second-order, management, ecological cybernetics)
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

- [lz-cybernetics.governor](../../plugins/lz-cybernetics.governor/) -- Early proof of concept: first-order cybernetic feedback hooks (observe-compare-correct), predating the Ralph Loop research

### Primary Source Material

- [A Brief History of Ralph](./sources/blog-brief-history-of-ralph/) -- Dex Horthy
- [Everything is a Ralph Loop](./sources/blog-everything-is-a-ralph-loop/) -- Geoffrey Huntley
- [From ReAct to Ralph Loop](./sources/blog-react-to-ralph-loop/) -- DanKun, Alibaba Cloud
- [11 Tips for AI Coding with Ralph Wiggum](./sources/blog-tips-for-ai-coding-ralph/) -- Matt Pocock
- [2026: The Year of the Ralph Loop Agent](./sources/blog-year-of-ralph-loop-agent/) -- Alexander Gekov
- [Ralph Wiggum Showdown](./sources/video-ralph-wiggum-showdown/) -- Dex Horthy, Geoffrey Huntley
- [Advanced Context Engineering for Coding Agents](./sources/blog-advanced-context-engineering/) -- Dex Horthy

### Cybernetics Literature

- W. Ross Ashby, *Design for a Brain: The Origin of Adaptive Behaviour* (1952) -- ultrastability, two-tier adaptive loops
- W. Ross Ashby, *An Introduction to Cybernetics* (1956) -- black box methodology, variety, requisite variety
- Claude Shannon, "A Mathematical Theory of Communication" (1948) -- channel capacity, signal-to-noise ratio
- Roger Conant and W. Ross Ashby, "Every Good Regulator of a System Must Be a Model of That System" (1970)
- Stafford Beer, *The Heart of Enterprise* (1979) -- redundancy of potential command, algedonic signals
- Gregory Bateson, *Steps to an Ecology of Mind* (1972) -- learning levels hierarchy (L-0 through L-III)
- Gregory Bateson, Don D. Jackson, Jay Haley, and John Weakland, "Toward a Theory of Schizophrenia" (1956) -- the original double bind paper
