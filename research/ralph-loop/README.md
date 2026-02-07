# Ralph Loop Research

A knowledge base documenting the Ralph Wiggum Loop technique for autonomous AI coding agents.

## Contents

| Document | Purpose |
|----------|---------|
| [OVERVIEW.md](./OVERVIEW.md) | Core concepts, philosophy, and the basic pattern. Covers iteration over perfection, external state management, objective verification, monolithic design, and the back-pressure wheel |
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | Technical implementation reference. Covers Three Phases/Two Prompts/One Loop architecture, context engineering, subagent orchestration, stop hook mechanics, verification layers, state persistence, prompt structure, and alternative loop types |
| [FAILURE-MODES.md](./FAILURE-MODES.md) | Known failure patterns with detection heuristics and mitigation strategies. Covers context rot, context pollution, compaction loss, premature termination, infinite loops, verification failures, and state corruption |
| [BEST-PRACTICES.md](./BEST-PRACTICES.md) | Practical guidance for effective Ralph usage. Covers Pocock's 11 Tips, backpressure engineering, prompt design patterns, context management strategies, tool integration, and recovery patterns |
| [HISTORY.md](./HISTORY.md) | Timeline and evolution from June 2025 SF meetup through mainstream recognition. Covers key milestones, case studies (Cursed Lang, BAML, Parquet, React refactoring), and community adoption |
| [CYBERNETICS-ANALYSIS.md](./CYBERNETICS-ANALYSIS.md) | Analysis through first-order, second-order, and management cybernetics frameworks. Maps feedback loops, requisite variety, observation paradoxes, and the Viable System Model onto Ralph patterns |
| [sources/](./sources/) | Primary source materials (blogs, videos, transcripts) |

## Quick Reference

```bash
# The Ralph Loop in its purest form
while :; do cat PROMPT.md | claude ; done
```

**Key Insights:**

- **Externalization:** Progress persists in files and git history, not in the LLM's context window. Each iteration reads fresh state from disk.
- **Objective Verification:** Loop continues until external criteria confirm completion (tests pass, builds succeed), not when the model thinks it's done.
- **Monolithic Design:** One process, one task per loop. Complexity is managed through iteration, not orchestration.
- **Back-Pressure:** Type systems, test suites, and build systems provide deterministic feedback that stops the wheel when generation is bad.

## Sources

See [sources/](./sources/) for the complete collection of primary source materials with transcripts, summaries, and links.

Additional references (full source materials in [sources/](./sources/)):

- [Everything is a Ralph Loop](./sources/blog-everything-is-a-ralph-loop/) -- Geoffrey Huntley
- [The Ralph Playbook](./sources/repo-how-to-ralph-wiggum/) -- Clayton Farr
- [From ReAct to Ralph Loop](./sources/blog-react-to-ralph-loop/) -- DanKun (Alibaba Cloud)
- [2026: The Year of the Ralph Loop Agent](./sources/blog-year-of-ralph-loop-agent/) -- Alexander Gekov
- [11 Tips For AI Coding With Ralph Wiggum](./sources/blog-tips-for-ai-coding-ralph/) -- Matt Pocock (AI Hero)
