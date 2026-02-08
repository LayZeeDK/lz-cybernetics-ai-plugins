# Ralph Loop Best Practices

Practical guidance for effective Ralph usage, compiled from community experience. This document is prescriptive and actionable -- it tells you what to do and why. For technical implementation details, see [IMPLEMENTATION.md](./IMPLEMENTATION.md). For failure patterns to avoid, see [FAILURE-MODES.md](./FAILURE-MODES.md). For conceptual background, see [OVERVIEW.md](./OVERVIEW.md).

## The 11 Tips (Pocock / AI Hero)

These tips are from Matt Pocock's detailed guide on using Ralph effectively. Each tip is expanded with full reasoning, examples, and actionable advice from the original article.

### 1. Ralph Is A Loop

Ralph is not a multi-phase plan. It is a bash loop that runs the same prompt repeatedly, letting the agent choose what to work on each iteration.

> "Instead of writing a new prompt for each phase, you run the same prompt in a loop." -- [Pocock, AI Hero](./sources/blog-tips-for-ai-coding-ralph/)

Each iteration:

1. Looks at a plan file to see what needs to be done
2. Looks at a progress file to see what has already been done
3. Decides what to do next
4. Explores the codebase
5. Implements the feature
6. Runs feedback loops (types, linting, tests)
7. Commits the code

The key improvement is that **the agent chooses the task, not you**. With multi-phase plans, a human writes a new prompt at the start of each phase. With Ralph, the agent picks what to work on next from your PRD. You define the end state. Ralph gets there.

This is also what distinguishes Ralph from earlier approaches. The progression is:

| Approach | Description | Limitation |
|----------|-------------|------------|
| Vibe coding | Accept AI suggestions without scrutiny | Low quality |
| Planning | Use plan mode to explore and plan before coding | Limited to one context window |
| Multi-phase plans | Break work into phases, each in a separate context window | Requires constant human involvement to write each prompt |
| **Ralph** | Same prompt in a loop, agent picks the task | None of the above |

As Pocock explains in his video:

> "This concept of a loop where you just take stuff off the board, take stuff off the board and keep working just feels so familiar. And the multi-phase plans that I was doing before just felt really onerous to put together." -- [Pocock, video](./sources/video-matt-poccock-ralph/)

**Actionable takeaway:** Do not write different prompts for different phases. Write one prompt that references a plan file, a progress file, and your codebase state. Run it in a loop. The agent figures out what to do next each time.

### 2. Start With HITL, Then Go AFK

There are two modes for running Ralph:

| Mode | How It Works | Best For | Script |
|------|-------------|----------|--------|
| **HITL** (human-in-the-loop) | Run once, watch, intervene | Learning, prompt refinement | `ralph-once.sh` |
| **AFK** (away from keyboard) | Run in a loop with max iterations | Bulk work, low-risk tasks | `afk-ralph.sh` |

**HITL Ralph** resembles pair programming. You and the AI work together, reviewing code as it is created. You can steer, contribute, and share project understanding in real-time. This is the best way to learn Ralph:

> "It's also the best way to learn Ralph. You'll understand what it does, refine your prompt, and build confidence before going hands-off." -- [Pocock, AI Hero](./sources/blog-tips-for-ai-coding-ralph/)

**AFK Ralph** unlocks real leverage. Once your prompt is solid, set it running, do something else, come back when it is done. Pocock built a CLI to ping him on WhatsApp when Ralph finishes, enabling full context switching to other work. Loops typically take 30-45 minutes, though they can run for hours.

**Always cap iterations for AFK Ralph.** Infinite loops are dangerous with stochastic systems. Typical limits:

- 5-10 iterations for small tasks
- 30-50 iterations for larger ones

**The progression:**

1. Start with HITL to learn and refine your prompt
2. Go AFK once you trust it
3. Review the commits when you return

### 3. Define The Scope

Before letting Ralph run, define what "done" looks like. This is a shift from planning to **requirements gathering**. Instead of specifying each step, describe the desired end state and let the agent figure out how to get there.

**Formats for defining scope:**

- A markdown list of user stories
- GitHub Issues or Linear tasks
- Beads (Steve Yegge's format)
- Structured JSON PRD items (recommended by Anthropic)

Pocock recommends JSON PRD items with a `passes` field, inspired by Anthropic's article on long-running agent harnesses:

```json
{
  "category": "functional",
  "description": "New chat button creates a fresh conversation",
  "steps": [
    "Click the 'New Chat' button",
    "Verify a new conversation is created",
    "Check that chat area shows welcome state"
  ],
  "passes": false
}
```

Ralph marks `passes` to `true` when complete. The PRD becomes both scope definition and progress tracker -- a living TODO list.

**Why scope matters -- a cautionary tale:**

> "I ran Ralph to increase test coverage on my AI Hero CLI. The repo had internal commands -- marked as internal but still user-facing. After three iterations, Ralph reported: 'Done with all user-facing commands.' But it had skipped the internal ones entirely. It decided they weren't user-facing and marked them to be ignored by coverage." -- [Pocock, AI Hero](./sources/blog-tips-for-ai-coding-ralph/)

The fix is to define exactly what you want:

| What to Specify | Why It Prevents Shortcuts |
|-----------------|--------------------------|
| Files to include | Ralph will not ignore "edge case" files |
| Stop condition | Ralph knows when "complete" actually means complete |
| Edge cases | Ralph will not decide certain things do not count |

**Adjusting PRDs mid-flight:** You can modify while Ralph is running. Set `passes` back to `false` with notes to redo work. Add new items mid-loop. You are not editing a linear plan -- you are describing a different end state.

### 4. Track Progress

Every Ralph loop should emit a `progress.txt` file, committed directly to the repo. This addresses a core challenge:

> "AI agents are like super-smart experts who forget everything between tasks. Each new context window starts fresh. Without a progress file, Ralph must explore the entire repo to understand the current state." -- [Pocock, AI Hero](./sources/blog-tips-for-ai-coding-ralph/)

A progress file short-circuits that exploration. Ralph reads it, sees what is done, and jumps straight into the next task.

**What goes in the progress file:**

- Tasks completed in this session
- Decisions made and why
- Blockers encountered
- Files changed
- Architectural decisions
- Notes for the next iteration

**Why commits matter:** Ralph should commit after each feature. This gives future iterations:

- A clean `git log` showing what changed
- The ability to `git diff` against previous work
- A rollback point if something breaks

The combination of progress file plus git history gives Ralph full context without burning tokens on exploration.

**Cleanup:** Do not keep `progress.txt` forever. Once your sprint is done, delete it. It is session-specific, not permanent documentation.

**Prompt language for progress tracking:**

```
After completing each task, append to progress.txt:
- Task completed and PRD item reference
- Key decisions made and reasoning
- Files changed
- Any blockers or notes for next iteration

Keep entries concise. Sacrifice grammar for the sake of concision.
This file helps future iterations skip exploration.
```

Use "append" not "update" -- "update" causes the LLM to rewrite the entire file, while "append" adds to the end.

### 5. Use Feedback Loops

Ralph's success depends on feedback loops. The more you give it, the higher quality code it produces.

> "Great programmers don't trust their own code. They don't trust external libraries. They especially don't trust their colleagues. Instead, they build automations and checks to verify what they ship. This humility produces better software. The same applies to AI agents." -- [Pocock, AI Hero](./sources/blog-tips-for-ai-coding-ralph/)

**Types of feedback loops:**

| Feedback Loop | What It Catches |
|---------------|----------------|
| TypeScript types | Type mismatches, missing props |
| Unit tests | Broken logic, regressions |
| Playwright MCP server | UI bugs, broken interactions |
| ESLint / linting | Code style, potential bugs |
| Pre-commit hooks | Blocks bad commits entirely |

The best setup blocks commits unless everything passes. Ralph cannot declare victory if the tests are red.

From the video, Pocock emphasizes types above all else:

> "You want types, types, types, types, types. Absolutely. You want the strongest types you can get." -- [Pocock, video](./sources/video-matt-poccock-ralph/)

**Why feedback loops matter beyond AI:** Every tip in this guide works for human developers too. Feedback loops, small steps, explicit scope -- these are not AI-specific techniques. They are good engineering. Ralph makes them non-negotiable.

**Prompt language for feedback loops:**

```
Before committing, run ALL feedback loops:
1. TypeScript: npm run typecheck (must pass with no errors)
2. Tests: npm run test (must pass)
3. Lint: npm run lint (must pass)

Do NOT commit if any feedback loop fails. Fix issues first.
```

See [IMPLEMENTATION.md](./IMPLEMENTATION.md#verification-layers-backpressure) for the full backpressure architecture including deterministic and non-deterministic verification.

### 6. Take Small Steps

> "The rate at which you can get feedback is your speed limit. Never outrun your headlights." -- [Pocock, AI Hero](./sources/blog-tips-for-ai-coding-ralph/)

Humans doing a big refactor might bite off a huge chunk and roll through it. Tests, types, and linting stay red for hours. Breaking work into smaller chunks means tighter feedback loops -- less work before you receive feedback.

The same applies to Ralph, with an additional constraint: **context windows are limited, and LLMs get worse as they fill up.** This is called context rot -- the longer you go, the stupider the output. See [FAILURE-MODES.md](./FAILURE-MODES.md#context-rot) for detailed mechanics.

**The tradeoff:**

Each Ralph iteration has startup costs. Ralph must pick a task, explore the repo, and gather context. These tokens are spent per-loop. If you are doing a large refactor, you do not want Ralph renaming one variable per iteration. But:

- Larger tasks mean less frequent feedback
- More context means lower quality code
- Smaller tasks mean higher quality, but slower progress

**Sizing your PRD items:**

For AFK Ralph, keep PRD items small. You want the agent on top form when you are not watching.

For HITL Ralph, you can make items slightly larger to see progress faster. But even then, bias small.

> "A refactor item might be as simple as: 'Change one function's parameters. Verify tests and types pass.'" -- [Pocock, AI Hero](./sources/blog-tips-for-ai-coding-ralph/)

From the video, Pocock also warns about the consequences of uneven task sizes:

> "If we have one enormous task here and then a bunch of smaller tasks, then when the LLM gets to this one, it's going to just be swallowed up. So when we design the PRD, we got to make sure that all of the tasks are nice and small." -- [Pocock, video](./sources/video-matt-poccock-ralph/)

**Prompt language for step size:**

```
Keep changes small and focused:
- One logical change per commit
- If a task feels too large, break it into subtasks
- Prefer multiple small commits over one large commit
- Run feedback loops after each change, not at the end

Quality over speed. Small steps compound into big progress.
```

### 7. Prioritize Risky Tasks

Ralph chooses its own tasks. Without explicit guidance, it will often pick the first item in the list or whatever seems easiest.

> "This mirrors human behavior. Developers love quick wins. But seasoned engineers know you should nail down the hard stuff first, before the easy work buries you in technical debt." -- [Pocock, AI Hero](./sources/blog-tips-for-ai-coding-ralph/)

**Focus on spikes** -- things you do not know how they will turn out. Build features end-to-end rather than layer by layer. Integrate early.

| Task Type | Priority | Why |
|-----------|----------|-----|
| Architectural work | High | Decisions cascade through entire codebase |
| Integration points | High | Reveals incompatibilities early |
| Unknown unknowns | High | Better to fail fast than fail late |
| UI polish | Low | Can be parallelized later |
| Quick wins | Low | Easy to slot in anytime |

**Use HITL for risky tasks.** Risky tasks need more human involvement. Use HITL Ralph for early architectural decisions -- the code from these tasks stays forever, and any shortcuts here cascade through the entire project.

Save AFK Ralph for when the foundation is solid. Once the architecture is proven and the risky integrations work, let Ralph run unsupervised on the lower-risk tasks.

**Prompt language for prioritization:**

```
When choosing the next task, prioritize in this order:
1. Architectural decisions and core abstractions
2. Integration points between modules
3. Unknown unknowns and spike work
4. Standard features and implementation
5. Polish, cleanup, and quick wins

Fail fast on risky work. Save easy wins for later.
```

### 8. Explicitly Define Software Quality

The agent does not know what kind of repo it is in. It does not know if this is a throwaway prototype or production code that will be maintained for years. You need to tell it explicitly.

| Repo Type | What To Say | Expected Behavior |
|-----------|------------|-------------------|
| Prototype | "This is a prototype. Speed over perfection." | Takes shortcuts, skips edge cases |
| Production | "Production code. Must be maintainable." | Follows best practices, adds tests |
| Library | "Public API. Backward compatibility matters." | Careful about breaking changes |

Put this in your `AGENTS.md` file, your skills, or directly in your prompt.

**The Repo Wins:** Your instructions compete with your codebase. When Ralph explores your repo, it sees two sources of truth: what you told it to do and what you actually did. One is a few lines of instruction. The other is thousands of lines of evidence.

> "You can write 'never use any types' in your prompt. But if Ralph sees any throughout your existing code, it will follow the codebase, not your instructions." -- [Pocock, AI Hero](./sources/blog-tips-for-ai-coding-ralph/)

**Software entropy acceleration:** Ralph accelerates entropy. A human might commit once or twice a day. Ralph can pile dozens of commits into a repo in hours. If those commits are low quality, entropy compounds fast. See [FAILURE-MODES.md](./FAILURE-MODES.md#software-entropy-acceleration) for the full analysis.

> "Agents amplify what they see. Poor code leads to poorer code. Low-quality tests produce unreliable feedback loops." -- [Pocock, AI Hero](./sources/blog-tips-for-ai-coding-ralph/)

This means you need to:

- Keep your codebase clean before letting Ralph loose
- Use feedback loops (linting, types, tests) to enforce standards
- Make quality expectations explicit and visible

**Example quality statement for `AGENTS.md`:**

```
This codebase will outlive you. Every shortcut you take becomes
someone else's burden. Every hack compounds into technical debt
that slows the whole team down.

You are not just writing code. You are shaping the future of this
project. The patterns you establish will be copied. The corners
you cut will be cut again.

Fight entropy. Leave the codebase better than you found it.
```

### 9. Use Docker Sandboxes

AFK Ralph needs permissions to edit files, run commands, and commit code. What stops it from running `rm -rf ~`? You are away from the keyboard, so you cannot intervene.

Docker sandboxes are the simplest solution:

```bash
docker sandbox run claude
```

This runs Claude Code inside a container. Your current directory is mounted, but nothing else. Ralph can edit project files and commit -- but cannot touch your home directory, SSH keys, or system files.

**The tradeoff:** Your global `AGENTS.md` and user skills will not be loaded. For most Ralph loops, this is fine.

**When to sandbox:**

- For **HITL Ralph**, sandboxes are optional -- you are watching
- For **AFK Ralph**, especially overnight loops, they are essential insurance against runaway agents

The Ralph Playbook expands on the security philosophy:

> "It's not if it gets popped, it's when. And what is the blast radius?" -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

**Sandbox options:**

| Environment | Type | Best For |
|-------------|------|----------|
| Docker sandboxes | Local | Developer machines, overnight loops |
| Fly Sprites | Remote | CI/CD, production-adjacent |
| E2B | Remote | Ephemeral, disposable environments |

**Escape hatches:** Ctrl+C stops the loop; `git reset --hard` reverts uncommitted changes; regenerate the plan if trajectory goes wrong.

**Claude Code native sandboxing:** Claude Code also ships with a built-in native sandbox that provides OS-level filesystem and network isolation without Docker. Enable with `/sandbox` or `"sandbox": { "enabled": true }` in settings.json. This uses Seatbelt (macOS) or bubblewrap (Linux/WSL2) to restrict writes to the CWD and network access to whitelisted domains. For details on all sandboxing tiers and a full threat model, see [SECURITY.md](./SECURITY.md).

### 10. Pay To Play

Current open-source models are not reliable enough for Ralph. The underlying model needs to be very capable for the simple loop approach to work.

> "I don't think open source models you can run on your laptop are good enough for Ralph yet. They require powerful GPUs, and the output quality isn't there. In AI coding, you have to pay to play." -- [Pocock, AI Hero](./sources/blog-tips-for-ai-coding-ralph/)

**HITL is still worth it even without AFK:**

| Approach | Effort Per Phase | Best For |
|----------|-----------------|----------|
| Multi-phase plans | Write new prompt | One-off large tasks |
| HITL Ralph | Rerun same prompt | Learning, refinement |
| AFK Ralph | Set and forget | Bulk work, automation |

Pocock reports being on the Anthropic 5x Max plan. Most of his usage is HITL.

**The golden age:** For the next couple of years, the market still pays human wages while AI can ship faster than humans. The market has not adjusted to the availability of extremely powerful AI coding tools. Yes, you have to pay. But the rewards are there.

See the [Cost Management](#cost-management) section below for detailed cost guidance from multiple practitioners.

### 11. Make It Your Own

Ralph is just a loop. That simplicity makes it infinitely configurable.

**Swap the task source:**

| Task Source | How It Works |
|-------------|-------------|
| GitHub Issues | Ralph picks an issue, implements it |
| Linear | Ralph pulls from your sprint |
| Beads | Ralph works through a beadfile |

The key insight stays the same: the agent chooses the task, not you. You are just changing where the list lives.

**Change the output:** Instead of committing directly to main, each Ralph iteration could:

- Create a branch and open a PR
- Add comments to existing issues
- Update a changelog or release notes

This is useful when you have a backlog of issues that need to become PRs. Ralph triages, implements, and opens the PR. You review when ready.

> "Any task that can be described as 'look at repo, improve something, report findings' fits the Ralph pattern. The loop is the same. Only the prompt changes." -- [Pocock, AI Hero](./sources/blog-tips-for-ai-coding-ralph/)

See the [Alternative Loop Types](#alternative-loop-types) section below for specific loop variations.

---

## Context Engineering Practices

These practices come from Dex Horthy's work on Advanced Context Engineering for Coding Agents, where a team of three used frequent intentional compaction to handle complex codebases including a 300k LOC Rust project.

### Research, Plan, Implement Workflow

The most effective structure for complex work is a three-phase workflow with compaction between each phase:

> "Essentially, this means designing your ENTIRE WORKFLOW around context management, and keeping utilization in the 40%-60% range." -- [Horthy, HumanLayer](./sources/blog-advanced-context-engineering/)

| Phase | Purpose | Human Review |
|-------|---------|--------------|
| **Research** | Understand the codebase, relevant files, and how information flows | Read the research, discard if wrong, re-steer |
| **Plan** | Outline exact steps, files to edit, testing/verification steps per phase | Verify approach, approve or redirect |
| **Implement** | Step through the plan phase by phase; compact status back into plan file after each phase | Review final output |

The phases are not rigid. Sometimes you skip research and go straight to planning. Sometimes you do multiple passes of compacted research before you are ready to implement. The key principle is: **each phase produces a compact artifact that seeds the next fresh context window**.

### Frequent Intentional Compaction

Intentional compaction means pausing your work, writing everything done so far to a file, and starting over with a fresh context window that reads that file. This is something most developers already do ad-hoc, but the breakthrough is making it **frequent and deliberate**.

> "You have probably done something I've come to call 'intentional compaction'. Whether you're on track or not, as your context starts to fill up, you probably want to pause your work and start over with a fresh context window." -- [Horthy, HumanLayer](./sources/blog-advanced-context-engineering/)

**What eats up context:**

- Searching for files
- Understanding code flow
- Applying edits
- Test/build logs
- Huge JSON blobs from tools

All of these flood the context window. Compaction distills them into structured artifacts. A good compaction output includes: the end goal, the approach being taken, the steps done so far, and the current failure being worked on.

**Task Spawning as Automatic Context Rotation:** When the orchestrator delegates work via the Task tool, each worker starts with a fresh 200K context -- effectively performing automatic context rotation without explicit compaction. This means the orchestrator can continue operating even at high context utilization (>60%) by delegating implementation work to fresh workers. However, the orchestrator itself still requires periodic compaction for its dispatch logic. The best practice becomes: compact the orchestrator's meta-state (escalation history, pattern observations), but delegate implementation work to fresh-context Tasks rather than performing it in the degraded orchestrator context. See `research/task-spawning/TASK-SPAWNING-GUIDE.md`.

### Subagent Deployment Strategy

Subagents are not about anthropomorphizing roles. They are about **context control**.

> "Subagents are not about playing house and anthropomorphizing roles. Subagents are about context control." -- [Horthy, HumanLayer](./sources/blog-advanced-context-engineering/)

The most common use case is letting a fresh context window do finding/searching/summarizing that enables the parent agent to get straight to work without clouding its context with Glob/Grep/Read calls.

The ideal subagent response should be a compact summary similar to a good intentional compaction: relevant files, code flow, potential approaches, and key constraints.

See [IMPLEMENTATION.md](./IMPLEMENTATION.md#subagent-orchestration) for the technical subagent orchestration patterns.

### Context Optimization Hierarchy

Optimize your context window in this priority order:

| Priority | Optimization | Worst Case |
|----------|-------------|------------|
| 1 (highest) | **Correctness** -- no incorrect information | Incorrect info leads to wrong implementations |
| 2 | **Completeness** -- no missing information | Missing info leads to incomplete work |
| 3 | **Size** -- minimize noise | Too much noise degrades output quality |
| 4 | **Trajectory** -- maintain forward progress | Getting stuck wastes tokens |

> "The worst things that can happen to your context window, in order, are: 1. Incorrect Information, 2. Missing Information, 3. Too much Noise." -- [Horthy, HumanLayer](./sources/blog-advanced-context-engineering/)

As Huntley puts it, quoted by Horthy:

> "The name of the game is that you only have approximately 170k of context window to work with. So it's essential to use as little of it as possible. The more you use the context window, the worse the outcomes you'll get." -- [Huntley, quoted in Horthy](./sources/blog-advanced-context-engineering/)

**Multi-Window Budgeting with Task Spawning:** Token budgeting extends beyond the single 200K window when Task spawning is available. The total token budget for a Ralph iteration becomes: `orchestrator_context + (N_workers x 200K) + (N_workers x 20K_overhead)`. For a typical batch of 5 workers, this is approximately 1.1M tokens of effective working memory. Budget planning should account for the 3-4x token multiplier (each worker's prompt includes the work directive, relevant state, and tool overhead). See `research/task-spawning/TASK-SPAWNING-GUIDE.md` for the full cost model.

### High-Leverage Review Points

The single most important insight from Horthy's work is **where** to invest human attention:

> "A bad line of code is... a bad line of code. But a bad line of a plan could lead to hundreds of bad lines of code. And a bad line of research, a misunderstanding of how the codebase works or where certain functionality is located, could land you with thousands of bad lines of code." -- [Horthy, HumanLayer](./sources/blog-advanced-context-engineering/)

**Focus human effort on the highest-leverage parts of the pipeline:**

| Review Point | Leverage | Why |
|-------------|---------|-----|
| Research | Highest | A wrong understanding of the codebase propagates through every subsequent step |
| Plan | High | A bad plan produces hundreds of bad lines of code |
| Code | Lower | A bad line of code is just a bad line of code |

This means: **review the plan, not the code.** If the research and plan are correct, the code will usually be correct too. This is also the key to handling large PRs:

> "I can't read 2000 lines of golang daily. But I can read 200 lines of a well-written implementation plan." -- [Horthy, HumanLayer](./sources/blog-advanced-context-engineering/)

### This Is Not Magic

Horthy is explicit that this requires deep engagement:

> "Remember that part in the example where I read the research and threw it out cause it was wrong? Or me and Vaibhav sitting DEEPLY ENGAGED FOR 7 HOURS? You have to engage with your task when you're doing this or it WILL NOT WORK." -- [Horthy, HumanLayer](./sources/blog-advanced-context-engineering/)

There is no magic prompt that solves all problems. Frequent intentional compaction makes performance **better**, but what makes it **good enough for hard problems** is building high-leverage human review into the pipeline.

---

## Specification-Driven Development

These patterns come from the Ralph Playbook by Clayton Farr, which formalizes the workflow from Geoffrey Huntley's original approach into a structured methodology.

### JTBD to Story Map to SLC Release

The Playbook extends Huntley's workflow with a product-oriented approach:

```
Audience (who)
    has JTBDs (why)
        fulfilled by Activities (how)
```

**Phase 1: Define audience and their JTBDs** -- WHO are we building for and what OUTCOMES do they want?

**Phase 2: Define activities** -- WHAT do users do to accomplish their JTBDs?

For each activity, determine:

- Capability depths (basic to enhanced) -- levels of sophistication
- Desired outcomes at each depth -- what success looks like

Activities are verbs in a journey ("upload photo", "extract colors") rather than capabilities ("color extraction system"). They are naturally scoped by user intent:

> "Topics: 'color extraction', 'layout engine' -- capability-oriented. Activities: 'upload photo', 'see extracted colors', 'arrange layout' -- journey-oriented." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

Activities sequence into a user story map. Horizontal slices through the map become candidate releases evaluated against Jason Cohen's SLC (Simple, Lovable, Complete) criteria:

- **Simple** -- Narrow scope you can ship fast
- **Complete** -- Fully accomplishes a job within that scope, not a broken preview
- **Lovable** -- People actually want to use it

### Acceptance-Driven Backpressure

The Playbook proposes connecting acceptance criteria directly to test requirements during planning, creating a direct line from "what success looks like" to "what verifies it":

> "Derive test requirements during planning from acceptance criteria in specs -- what specific outcomes need verification (behavior, performance, edge cases). Tests verify WHAT works, not HOW it's implemented." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

The key distinction:

| Layer | Contains | Example |
|-------|----------|---------|
| Acceptance criteria (in specs) | Behavioral outcomes | "Extracts 5-10 dominant colors from any uploaded image" |
| Test requirements (in plan) | Verification points | "Required tests: Extract 5-10 colors, Performance <100ms" |
| Implementation approach (up to Ralph) | Technical decisions | Ralph decides (not specified) |

**Specify WHAT to verify (outcomes), not HOW to implement (approach).** This maintains the "Let Ralph Ralph" principle -- Ralph decides implementation details while having clear success signals.

Benefits:

- Prevents "cheating" -- cannot claim done without required tests passing
- Enables TDD workflow -- test requirements known before implementation
- Improves convergence -- clear completion signal versus ambiguous "seems done?"
- Maintains determinism -- test requirements in plan (known state) not emergent (probabilistic)

### Non-Deterministic Backpressure (LLM-as-Judge)

Some acceptance criteria resist programmatic validation: creative quality, aesthetics, UX feel, content appropriateness. The Playbook proposes LLM-as-Judge tests as backpressure with binary pass/fail:

> "LLM reviews are non-deterministic (same artifact may receive different judgments across runs). This aligns with Ralph philosophy: 'deterministically bad in an undeterministic world.' The loop provides eventual consistency through iteration -- reviews run until pass, accepting natural variance." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

See [IMPLEMENTATION.md](./IMPLEMENTATION.md#non-deterministic-backpressure-llm-as-judge) for the technical implementation pattern including the `createReview` API.

### Generating Specifications as a Ralph Use Case

The Playbook treats specification generation as a first-class Ralph use case. Specs are not static documents created once -- they can be generated, refined, and corrected by the loop itself:

> "BUILDING mode can even create new specs if missing. The circularity is intentional: eventual consistency through iteration." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

This means the loop is self-improving: if a spec is missing or inconsistent, the building phase can identify the gap and create or update the spec, which then feeds back into future planning iterations.

---

## "Let Ralph Ralph"

The core philosophy behind Ralph's effectiveness. From the Ralph Playbook:

> "Ralph's effectiveness comes from how much you trust it to do the right thing (eventually) and engender its ability to do so." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

### Self-Identification, Self-Correction, Self-Improvement

Lean into the LLM's ability to:

- **Self-identify** -- recognize what needs to be done from the plan and codebase state
- **Self-correct** -- fix mistakes when backpressure signals failures
- **Self-improve** -- update `AGENTS.md` with operational learnings, update `IMPLEMENTATION_PLAN.md` with discoveries

This applies to the implementation plan, task definition, and prioritization. Eventual consistency is achieved through iteration.

### Trust the Process with Appropriate Guardrails

You need to get out of Ralph's way. Your job is now to sit **on** the loop, not **in** it -- to engineer the setup and environment that allows Ralph to succeed.

> "To get the most out of Ralph, you need to get out of his way. Ralph should be doing all of the work, including deciding which planned work to implement next and how to implement it." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

**Observe and course correct** -- especially early on, watch the loop. What patterns emerge? Where does Ralph go wrong? What signs does he need? The prompts you start with will not be the prompts you end with -- they evolve through observed failure patterns.

**Tune it like a guitar** -- instead of prescribing everything upfront, observe and adjust reactively. When Ralph fails a specific way, add a sign to help him next time. Signs are not just prompt text -- they are anything Ralph can discover:

- Prompt guardrails -- explicit instructions like "don't assume not implemented"
- `AGENTS.md` -- operational learnings about how to build/test
- Utilities in your codebase -- when you add a pattern, Ralph discovers it and follows it

### AGENTS.md as the Heart of the Loop

> "AGENTS.md is a concise, operational 'how to run/build' guide. NOT a changelog or progress diary." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

Keep it brief (roughly 60 lines). It should contain:

- Build commands
- Test commands (targeted and full suite)
- Typecheck/lint commands
- Codebase patterns and conventions
- Operational learnings from past iterations

Status, progress, and planning belong in `IMPLEMENTATION_PLAN.md`, not in `AGENTS.md`.

> "IMPORTANT: Keep AGENTS.md operational only -- status updates and progress notes belong in IMPLEMENTATION_PLAN.md. A bloated AGENTS.md pollutes every future loop's context." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

The building prompt instructs Ralph to update `AGENTS.md` with operational learnings (like the correct command to run tests), making it a self-improving artifact.

### The Plan Is Disposable

If the plan is wrong, throw it out and start over. Regeneration cost is one planning loop -- cheap compared to Ralph going in circles.

> "I have deleted the TODO list multiple times." -- [Huntley, via Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

Regenerate when:

- Ralph is going off track (implementing wrong things, duplicating work)
- Plan feels stale or does not match current state
- Too much clutter from completed items
- You have made significant spec changes
- You are confused about what is actually done

---

## Alternative Loop Types

Ralph does not need to work through a feature backlog. Any task that can be described as "look at repo, improve something, report findings" fits the pattern.

### Test Coverage Loop

Point Ralph at your coverage metrics. It finds uncovered lines, writes tests, and iterates until coverage hits your target.

> "I used this to take AI Hero CLI from 16% to 100% coverage." -- [Pocock, AI Hero](./sources/blog-tips-for-ai-coding-ralph/)

```
@coverage-report.txt

Find uncovered lines in the coverage report.
Write tests for the most critical uncovered code paths.
Run coverage again and update coverage-report.txt.
Target: 80% coverage minimum.
```

### Duplication Loop

Hook Ralph up to `jscpd` to find duplicate code. Ralph identifies clones, refactors into shared utilities, and reports what changed.

### Linting Loop

Feed Ralph your linting errors. It fixes them one by one, running the linter between iterations to verify each fix.

```
Run: npm run lint
Fix ONE linting error at a time.
Run lint again to verify the fix.
Repeat until no errors remain.
```

### Entropy Loop

Ralph scans for code smells -- unused exports, dead code, inconsistent patterns -- and cleans them up. Software entropy in reverse.

```
Scan for code smells: unused exports, dead code, inconsistent patterns.
Fix ONE issue per iteration.
Document what you changed in progress.txt.
```

Huntley frames this as the broader mindset shift:

> "Software is now clay on the pottery wheel and if something isn't right then I just throw it back on the wheel to address items that need resolving." -- [Huntley](./sources/blog-everything-is-a-ralph-loop/)

See [IMPLEMENTATION.md](./IMPLEMENTATION.md#alternative-loop-types) for implementation details of each loop type.

---

## Prompt Engineering

### Critical Language Patterns

Specific phrasing matters. These patterns come from Huntley's prompt templates as documented in the Ralph Playbook:

| Instead of | Use | Why |
|------------|-----|-----|
| "Read the file" | "Study the file" | More thorough analysis |
| Assume not implemented | "Don't assume not implemented" | Forces code search first -- this is "the Achilles' heel" |
| Single agent | "Using parallel subagents" / "up to N subagents" | Better context utilization |
| General instructions | "Only 1 subagent for build/tests" | Sequential validation prevents race conditions |
| What to do | "Capture the why" | Better documentation |
| "Think hard" | "Ultrathink" | Triggers extended reasoning |
| Generic instructions | "Keep it up to date" | Maintains state persistence artifacts |
| Leave it for later | "If functionality is missing then it's your job to add it" | Prevents placeholder implementations |
| Ignore problems | "Resolve them or document them" | Nothing gets silently dropped |

### Prompt Structure

The recommended prompt structure uses a numbered phase system with guardrail numbering:

```markdown
# Phase 0 (0a, 0b, 0c)
Orient: study specs, source location, current plan

# Phase 1-4
Main instructions: task selection, implementation, validation, commit

# Guardrails (9s numbering -- higher number = more critical)
99999. Capture the why
999999. Single sources of truth
9999999. Git tag on clean state
99999999. Extra logging for debugging
999999999. Keep IMPLEMENTATION_PLAN.md current
9999999999. Update AGENTS.md with operational learnings
99999999999. Resolve or document bugs
999999999999. Implement completely -- no placeholders
9999999999999. Clean completed items from plan
99999999999999. Fix spec inconsistencies with Opus subagent
999999999999999. Keep AGENTS.md operational only
```

The "9s" numbering convention is significant -- it ensures guardrails sort to the bottom of the prompt where they function as invariants, and the increasing number of 9s signals increasing criticality.

See [IMPLEMENTATION.md](./IMPLEMENTATION.md#prompt-structure) for full prompt templates for both planning and building modes.

### Guardrail Patterns

When a failure pattern emerges, add a guardrail. These are called "signs" -- things you put in place to help Ralph next time:

```markdown
### Sign: Check imports before adding
- **Instruction**: Verify import doesn't already exist before adding
- **Reason**: Duplicate imports caused build failures

### Sign: Run full test suite
- **Instruction**: Run `npm test` not just changed tests
- **Reason**: Regression introduced in iteration 12

### Sign: Don't modify auth files
- **Instruction**: Files in src/auth/* are off-limits without explicit ask
- **Reason**: Broke authentication in iteration 8
```

See [FAILURE-MODES.md](./FAILURE-MODES.md#the-tuning-philosophy) for the philosophy behind reactive guardrail addition.

---

## Steering Mechanisms

### Upstream Steering

Set up deterministic context loading that shapes Ralph's behavior before it starts working:

1. **Always load the same files** -- `PROMPT.md` + `AGENTS.md` loaded every iteration so the model starts from a known state
2. **Allocate first ~5,000 tokens for specs** -- requirements loaded before anything else
3. **Let existing code patterns influence output** -- if Ralph is generating wrong patterns, add/update utilities and existing code patterns to steer it toward correct ones

> "Your existing code shapes what gets used and generated. If Ralph is generating wrong patterns, add/update utilities and existing code patterns to steer it toward correct ones." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

### Downstream Steering (Backpressure)

Create checks that reject substandard work:

```bash
# .husky/pre-commit (or equivalent)
npm run lint
npm run typecheck
npm run test
npm run build
```

If any fails, the commit is blocked, forcing Ralph to fix issues before proceeding.

The prompt says "run tests" generically. `AGENTS.md` specifies the actual commands, making backpressure project-specific.

> "Prompt says 'run tests' generically. AGENTS.md specifies actual commands to make backpressure project-specific." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

---

## Cost Management

For a comprehensive measurement framework and ROI calculation, see [METRICS.md](./METRICS.md).

### Model Selection

| Provider/Plan | Approximate Cost | Best For |
|-------------|-----------------|----------|
| Claude Pro | ~$20/month | Learning Ralph, occasional HITL |
| Claude Max (5x) | ~$90-100/month | Regular HITL usage |
| Claude API (Opus) | Variable per token | AFK loops, team usage |

Pocock reports being on the Anthropic 5x Max plan at around GBP 90/month, with most usage being HITL.

The Ralph Playbook recommends using Opus for the primary agent (task selection, prioritization, complex reasoning) and optionally using Sonnet for speed in build mode when the plan is clear and tasks are well-defined.

### Team Cost Reality

Horthy provides concrete team-level cost data:

> "Our team of three is averaging about $12k on opus per month." -- [Horthy, HumanLayer](./sources/blog-advanced-context-engineering/)

This covers deep engagement with complex codebases including 300k LOC Rust projects, with the research/plan/implement workflow.

### Per-Task Cost Estimation

Complex tasks can cost $50-150+ in API credits. The cost is proportional to:

- Number of iterations needed
- Model used (Opus vs Sonnet)
- Codebase size (more tokens for exploration)
- Task complexity (more reasoning, more tool calls)

### Token Efficiency Through Subagent Delegation

The primary context window should be reserved for orchestration. Delegate expensive operations to subagents:

- Use subagents for file searching, code reading, and summarizing
- Keep the main context for task selection, planning, and coordination
- Each subagent gets its own context window that is garbage-collected when done
- Compact aggressively between phases, but protect specifications and plan state

> "Don't allocate expensive work to main context; spawn subagents whenever possible instead. Each subagent gets ~156kb that's garbage collected." -- [Ralph Playbook](./sources/repo-how-to-ralph-wiggum/)

### Iteration Limits

| Task Size | Suggested Limit |
|-----------|-----------------|
| Small fix | 5-10 |
| Feature | 20-30 |
| Major work | 50 |

### Early Termination

Stop early if:

- Same error 3+ times (see [FAILURE-MODES.md](./FAILURE-MODES.md#going-in-circles))
- No commits in 5+ iterations
- Cost exceeds budget
- Agent shows confusion or contradictions
- Context is in "the gutter" (see [FAILURE-MODES.md](./FAILURE-MODES.md#context-pollution--the-gutter))

---

## When NOT to Use Ralph

From Pocock's video and discussion, Ralph is not universally applicable. For alternative tools that may be better suited in these scenarios, see [ALTERNATIVES.md](./ALTERNATIVES.md#decision-matrix-when-to-use-what).

### Subjective Tasks

Tasks requiring human aesthetic judgment -- visual design, UX "feel", brand tone -- do not have clear programmatic feedback loops. Without backpressure, Ralph cannot self-correct. The non-deterministic backpressure pattern (LLM-as-judge) partially addresses this, but it remains an area where human review is essential.

### Deep Contextual Understanding Required

When a task requires understanding that spans the entire codebase or requires institutional knowledge not captured in code, Ralph's per-iteration context window may not be sufficient. Horthy's experience with parquet-java illustrates this:

> "The research steps didn't go deep enough through the dependency tree, and assumed classes could be moved upstream without introducing deeply nested hadoop dependencies." -- [Horthy, HumanLayer](./sources/blog-advanced-context-engineering/)

You probably need at least one person who is an expert in the codebase for complex cross-cutting work.

### Cost-Sensitive Applications

If every API call counts, AFK Ralph's token consumption may be prohibitive. HITL Ralph provides better cost control since you can intervene before the agent burns tokens on dead ends.

### Untyped or Untested Codebases

Without feedback loops (types, tests, linting), Ralph has no way to verify its own work. The loop becomes "vibe coding in a for loop" -- fast, but with compounding quality issues.

> "With Ralph, you want more tests. You want higher quality tests. You want non-flaky tests." -- [Pocock, video](./sources/video-matt-poccock-ralph/)

---

## Mode Switching

### When to Plan

Switch to planning mode when:

- No implementation plan exists
- Plan is stale (more than 1 day old or significantly wrong)
- Major pivot in requirements
- After completing a major milestone
- Ralph is going in circles or implementing wrong things
- Too much clutter from completed items in the plan

### When to Build

Switch to building mode when:

- Valid plan exists
- Clear next task identified
- Prerequisites complete
- You have reviewed and approved the plan (high-leverage review point)

---

## Team Patterns

### Code Review Integration

With spec-driven development, the review process shifts:

1. Ralph creates a PR
2. Human reviews the **plan and specs** (high leverage) rather than every line of code
3. Human spot-checks the code and reads tests carefully
4. Feedback becomes guardrails for future iterations
5. Ralph addresses review comments

Horthy describes the transformation:

> "It was uncomfortable at first. I had to learn to let go of reading every line of PR code. I still read the tests pretty carefully, but the specs became our source of truth for what was being built and why." -- [Horthy, HumanLayer](./sources/blog-advanced-context-engineering/)

### Mental Alignment

The biggest challenge with productive AI coders is not code quality -- it is team members losing touch with what the codebase does.

> "The biggest source of internal unrest and frustration on the team was the lack of mental alignment. I was starting to lose touch with what our product was and how it worked." -- [Horthy, HumanLayer](./sources/blog-advanced-context-engineering/)

The research/plan/implement workflow addresses this by producing readable artifacts at each stage. Plans and research documents become the team's shared understanding, replacing the traditional role of code review for mental alignment.

### Handoff Protocol

When switching from Ralph to human (or between team members):

1. Ensure `progress.txt` / `IMPLEMENTATION_PLAN.md` is current
2. Commit all work in progress
3. Document blocking issues
4. Note any concerning patterns observed
5. Review the plan -- it is the fastest way to understand the current state

---

## Sources

- [11 Tips For AI Coding With Ralph Wiggum](./sources/blog-tips-for-ai-coding-ralph/) -- Matt Pocock
- [Ship Working Code While You Sleep With the Ralph Wiggum Technique (video)](./sources/video-matt-poccock-ralph/) -- Matt Pocock
- [The Ralph Playbook](./sources/repo-how-to-ralph-wiggum/) -- Clayton Farr
- [Advanced Context Engineering for Coding Agents](./sources/blog-advanced-context-engineering/) -- Dex Horthy
- [Everything is a Ralph Loop](./sources/blog-everything-is-a-ralph-loop/) -- Geoffrey Huntley
- [Ralph Wiggum as a Software Engineer](./sources/blog-ralph-wiggum-technique/) -- Geoffrey Huntley
