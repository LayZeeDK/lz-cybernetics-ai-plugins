# Ralph Loop Best Practices

Practical guidance for effective Ralph usage, compiled from community experience.

## The 11 Tips (from AI Hero)

### 1. Ralph Is A Loop

Don't write new prompts for each phase. Run the same prompt repeatedly. The agent chooses the task based on:

- Plan file state
- Progress file state
- Codebase state

### 2. Start With HITL, Then Go AFK

**Human-In-The-Loop (HITL):** Watch and intervene, like pair programming. Use this to:

- Validate your prompt works
- Understand failure patterns
- Build trust in the approach

**Away-From-Keyboard (AFK):** Once confident, let Ralph run autonomously with iteration caps:

- 5-10 iterations for small tasks
- 30-50 iterations for larger ones

### 3. Define The Scope

Before launching, specify exactly what "done" means:

```markdown
## Success Criteria
- [ ] All unit tests pass
- [ ] TypeScript compiles without errors
- [ ] ESLint reports no errors
- [ ] Feature X works as specified in spec/feature-x.md
```

Without clear scope, Ralph will take shortcuts or misinterpret requirements.

### 4. Track Progress

Maintain `progress.txt` (or `.ralph/progress.md`) documenting:

- Completed tasks
- Key decisions
- Blockers encountered
- Files changed

This solves the problem that "AI agents are like super-smart experts who forget everything between tasks."

### 5. Use Feedback Loops

Layer multiple verification mechanisms:

| Layer | Purpose |
|-------|---------|
| TypeScript | Type safety |
| Unit tests | Correctness |
| ESLint | Code style |
| Pre-commit hooks | Gate commits |

"The more loops you give it, the higher quality code it produces."

### 6. Take Small Steps

Keep tasks small for frequent feedback:

- Smaller tasks = faster feedback
- Faster feedback = higher quality
- Large chunks lead to context rot

"The rate at which you can get feedback is your speed limit."

### 7. Prioritize Risky Tasks

Order work by risk:

1. **First:** Architectural decisions, integration points
2. **Second:** Unknown unknowns
3. **Third:** Standard features
4. **Last:** Polish

Use HITL for risky early work; AFK for lower-risk tasks once foundation is solid.

### 8. Explicitly Define Quality

Tell Ralph what kind of repo it's working in:

- **Prototype:** Speed over quality
- **Production:** Balanced
- **Library:** High quality, documentation matters

Your codebase is evidence -- poor existing code influences Ralph's output. Keep it clean before letting Ralph loose.

### 9. Use Docker Sandboxes

For AFK runs, isolate Ralph:

```bash
docker sandbox run claude
```

Ralph can edit project files and commit but cannot access home directory, SSH keys, or system files.

### 10. Pay To Play

Current open-source models aren't reliable enough for Ralph. Budget for:

- Claude Pro/Max subscription
- API credits ($50-150+ per complex task)

### 11. Make It Your Own

Adapt Ralph to your workflow:

- Pull tasks from GitHub Issues or Linear
- Create branches/PRs instead of committing directly
- Add custom verification steps
- Build alternative loops (coverage improvement, lint fixes)

## Prompt Engineering Tips

### Critical Language Patterns

Specific phrasing affects results:

| Instead of | Use | Why |
|------------|-----|-----|
| "Read the file" | "Study the file" | More thorough analysis |
| Assume not implemented | "Don't assume not implemented" | Forces code search first |
| Single agent | "Using parallel subagents" | Better context utilization |
| General instructions | "Only 1 subagent for build/tests" | Sequential validation |
| What to do | "Capture the why" | Better documentation |

### Prompt Structure

```markdown
# Context
[What we're building, why]

# Specifications
[Link to or embed specs]

# Success Criteria
[Objective, verifiable conditions]

# Constraints
- One task per iteration
- Commit only when tests pass
- Don't refactor unless asked
- Ask before deleting files

# Guardrails
[Learned constraints from previous failures]

# Current State
See IMPLEMENTATION_PLAN.md

# Instructions
1. Study the codebase
2. Select highest priority incomplete task
3. Implement minimally
4. Verify all checks pass
5. Commit with descriptive message
6. Update progress file
```

## Guardrail Patterns

When a failure pattern emerges, add a guardrail:

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

## Steering Mechanisms

### Upstream Steering

Set up deterministic context loading:

1. Always load `PROMPT.md` first
2. Always load `AGENTS.md` (guardrails)
3. Let existing code patterns influence output

### Downstream Steering (Backpressure)

Create checks that reject substandard work:

```bash
# .husky/pre-commit
npm run lint
npm run typecheck
npm run test
npm run build
```

If any fails, commit is blocked, forcing Ralph to fix issues.

## Mode Switching

### When to Plan

- No implementation plan exists
- Plan is stale (>1 day old or significantly wrong)
- Major pivot in requirements
- After completing a major milestone

### When to Build

- Valid plan exists
- Clear next task identified
- Prerequisites complete

## Cost Management

### Token Efficiency

- Use subagents for expensive read operations
- Keep main context for orchestration
- Compact aggressively (but protect specs)

### Iteration Limits

| Task Size | Suggested Limit |
|-----------|-----------------|
| Small fix | 5-10 |
| Feature | 20-30 |
| Major work | 50 |

### Early Termination

Stop early if:

- Same error 3+ times
- No commits in 5+ iterations
- Cost exceeds budget
- Agent shows confusion

## Team Patterns

### Code Review Integration

1. Ralph creates PR
2. Human reviews
3. Feedback becomes guardrails
4. Ralph addresses comments

### Handoff Protocol

When switching from Ralph to human:

1. Ensure progress.md is current
2. Commit all work in progress
3. Document blocking issues
4. Note any concerning patterns observed

## Sources

- [AI Hero - 11 Tips For AI Coding With Ralph Wiggum](https://www.aihero.dev/tips-for-ai-coding-with-ralph-wiggum)
- [GitHub - how-to-ralph-wiggum](https://github.com/ghuntley/how-to-ralph-wiggum)
- [Geoffrey Huntley - Ralph Wiggum as a "software engineer"](https://ghuntley.com/ralph/)
