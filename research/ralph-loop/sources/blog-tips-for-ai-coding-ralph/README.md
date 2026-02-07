# 11 Tips For AI Coding With Ralph Wiggum

- **Author:** Matt Pocock (AI Hero)
- **Date:** 2025
- **URL:** https://www.aihero.dev/tips-for-ai-coding-with-ralph-wiggum
- **Type:** Blog post

## Article

See [article.md](./article.md) for the full blog post content in Markdown.

## Summary

A practical guide providing 11 operational tips for using the Ralph Wiggum technique to enable autonomous "AFK coding." Matt Pocock frames the evolution from vibe coding through planning and multi-phase prompts to Ralph as a simplification -- instead of writing new prompts for each phase, you run the same prompt in a loop and let the agent choose what to work on next.

The tips cover the full lifecycle: understanding Ralph as a loop, transitioning from HITL to AFK operation, defining scope with structured PRDs, tracking progress between iterations, using feedback loops (types, tests, linting) as guardrails, keeping iterations small, prioritizing risky architectural work first, explicitly defining software quality expectations, using Docker sandboxes for safety, managing costs, and customizing Ralph for alternative loop types (test coverage, duplication, linting, entropy).

## Key Concepts

- "The agent chooses the task, not you" -- the key shift from multi-phase planning to Ralph
- Two modes: HITL (human-in-the-loop) for learning and refinement, AFK (away from keyboard) for bulk autonomous work
- Start with HITL, graduate to AFK once prompts are stable and trusted
- Structured `prd.json` with `passes: boolean` serves as both scope definition and progress tracker
- Scope matters: vague tasks lead to shortcuts (e.g. Ralph skipping "internal" commands when told to improve test coverage)
- Feedback loops are non-negotiable: TypeScript types, unit tests, Playwright MCP, ESLint, pre-commit hooks
- "The rate at which you can get feedback is your speed limit. Never outrun your headlights."
- Context rot: LLMs get worse as context fills up, so smaller iterations produce higher quality
- The codebase is a stronger signal than instructions -- agents amplify existing patterns, including poor ones
- "Ralph accelerates software entropy" -- low-quality code compounds fast with dozens of commits per hour
- Docker sandboxes are essential for AFK Ralph to prevent `rm -rf ~` scenarios

### The 11 Tips

1. Ralph Is A Loop
2. Start With HITL, Then Go AFK
3. Define The Scope
4. Track Ralph's Progress
5. Use Feedback Loops
6. Take Small Steps
7. Prioritize Risky Tasks
8. Explicitly Define Software Quality
9. Use Docker Sandboxes
10. Pay To Play (cost considerations)
11. Make It Your Own (alternative loop types)

### Alternative Loop Types

- Test Coverage Loop -- iterate until coverage target met
- Duplication Loop -- find and refactor duplicate code via jscpd
- Linting Loop -- fix lint errors one at a time
- Entropy Loop -- scan and fix code smells (unused exports, dead code)

## Referenced Resources

### GitHub Repos

- [mattpocock/ai-hero-cli](https://github.com/mattpocock/ai-hero-cli) -- Used as real-world example for test coverage
- [mattpocock/course-video-manager](https://github.com/mattpocock/course-video-manager) -- Feature development example
- [steveyegge/beads](https://github.com/steveyegge/beads) -- Alternative task source format
- [ghuntley/ralph-lang](https://github.com/ghuntley/ralph-lang) -- Programming language built with Ralph

### Articles Referenced

- [Anthropic - Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) -- Inspiration for progress tracking and PRD structure
- [Chroma Research - Context Rot](https://research.trychroma.com/context-rot) -- Research on LLM degradation with context length

### Tools / Packages

- Claude Code -- Primary AI coding CLI used with Ralph
- Docker sandboxes -- `docker sandbox run claude` for isolated execution
- Playwright MCP -- UI testing feedback loop
- jscpd -- Duplicate code detection for the Duplication Loop

## Related Sources

- [Ralph Wiggum as a "Software Engineer"](../blog-ralph-wiggum-technique/) -- Original technique by Geoffrey Huntley
- [From ReAct to Ralph Loop](../blog-react-to-ralph-loop/) -- References this article directly in its bibliography
- [How to Ralph Wiggum](../repo-how-to-ralph-wiggum/) -- Structured playbook expanding on many of these tips
- [A Brief History of Ralph](../blog-brief-history-of-ralph/) -- Historical context for the technique
- [Advanced Context Engineering](../blog-advanced-context-engineering/) -- Context engineering strategies complementing these tips
