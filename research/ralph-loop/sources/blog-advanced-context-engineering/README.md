# Advanced Context Engineering for Coding Agents

- **Author:** Dex Horthy (HumanLayer)
- **Date:** August 2025
- **URL:** https://hlyr.dev/ace-fca
- **Source:** https://github.com/humanlayer/advanced-context-engineering-for-coding-agents
- **Type:** Blog post / technical article

## Article

See [article.md](./article.md) for the full blog post content in Markdown.

## Summary

A comprehensive guide to making AI coding tools effective in complex production codebases through systematic context management. The article presents a three-phase workflow (Research, Planning, Implementation) and demonstrates that context window contents are the primary lever for improving AI coding output quality. The approach successfully handled a 300,000-line Rust codebase.

## Key Concepts

- Context engineering over waiting for smarter models
- Three-phase workflow: Research -> Planning -> Implementation
- Specifications as primary artifacts (not conversational "vibe coding")
- Context optimization hierarchy: Correctness > Completeness > Noise reduction
- Subagents as fresh context windows for search, analysis, and summarization
- High-leverage human review at Research and Plan stages, not line-by-line code review
- "A bad line of a plan could lead to hundreds of bad lines of code"

### Case Studies

| Project | Team | Time | Result |
|---------|------|------|--------|
| BAML bug fix (300K LOC Rust) | 1 developer (amateur Rust) | 1 hour planning | Approved PR within 24 hours |
| Cancellation + WASM features | 2 developers | 7 hours total | 35,000 lines of code |
| Parquet Java Hadoop removal | 1 developer | 7 hours | Failed -- insufficient domain expertise |

### Financial Context

- ~$12,000/month Claude (Opus) costs for a 3-person team
- Intern shipped 2 PRs on day one, 10 PRs by day eight

## Referenced Resources

### GitHub Repos

- [humanlayer/advanced-context-engineering-for-coding-agents](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents) -- Source for the article
- [humanlayer/humanlayer](https://github.com/humanlayer/humanlayer) -- HumanLayer main project

### Articles Referenced

- Sean Grove -- "Specs are the new code" (AI Engineer 2025)
- Stanford study on AI's impact on developer productivity
- Blake Smith -- "Code Review Essentials for Software Teams"

### Products

- CodeLayer -- "Post-IDE" environment for spec-first agentic workflows (humanlayer.dev)

## Related Sources

- [Ralph Wiggum as a "Software Engineer"](../blog-ralph-wiggum-technique/) -- Referenced as foundational approach
- [A Brief History of Ralph](../blog-brief-history-of-ralph/) -- This article is featured as key August 2025 development
- [Advanced Context Engineering (video)](../video-advanced-context-engineering/) -- Related video presentation
