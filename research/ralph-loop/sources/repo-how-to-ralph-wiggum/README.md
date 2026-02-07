# The Ralph Playbook

- **Author:** Clayton Farr
- **Date:** December 2025
- **URL:** https://github.com/ghuntley/how-to-ralph-wiggum
- **Type:** GitHub repository

## Article

See [article.md](./article.md) for the full repository README content in Markdown.

## Summary

A comprehensive, community-authored playbook that distills Geoffrey Huntley's Ralph Wiggum technique into a structured reference guide. Clayton Farr organized insights from Huntley's videos, blog posts, and community discussions into a "Three Phases, Two Prompts, One Loop" workflow architecture.

The playbook covers the full Ralph methodology: Phase 1 (Define Requirements via JTBD topics of concern), Phase 2 (Planning mode via gap analysis), and Phase 3 (Building mode via iterative implementation). It includes detailed prompt templates (`PROMPT_plan.md` and `PROMPT_build.md`), file structure conventions, context management strategies, and several proposed enhancements including acceptance-driven backpressure, non-deterministic LLM-as-judge testing, Ralph-friendly work branches, and a JTBD-to-SLC release planning framework.

## Key Concepts

- Three Phases, Two Prompts, One Loop: Requirements -> Planning -> Building, with two prompt files swapped as needed
- Context is everything: 200K+ advertised tokens = ~176K usable, with 40-60% utilization as the "smart zone"
- Main agent context is a scheduler; spawn subagents for expensive work to preserve context quality
- Backpressure (tests, typechecks, lints) steers Ralph downstream; prompt guardrails steer upstream
- "Let Ralph Ralph" -- lean into the LLM's ability to self-identify, self-correct, and self-improve
- The implementation plan is disposable: regenerate when wrong, stale, or cluttered
- AGENTS.md is the "heart of the loop" -- a concise operational guide, not a changelog
- Guardrail numbering convention: `99999...` (higher number = more critical invariant)
- `--dangerously-skip-permissions` is required for autonomous operation; always run in a sandbox

### Proposed Enhancements

- Acceptance-Driven Backpressure -- derive test requirements from acceptance criteria during planning
- Non-Deterministic Backpressure -- LLM-as-judge for subjective quality (tone, aesthetics, UX)
- Ralph-Friendly Work Branches -- scoped plans per branch via `plan-work` mode
- JTBD -> Story Map -> SLC Release -- connect audience JTBDs to Simple/Lovable/Complete releases

## Referenced Resources

### GitHub Repos

- [ghuntley/how-to-ralph-wiggum](https://github.com/ghuntley/how-to-ralph-wiggum) -- Source repository
- [ClaytonFarr.github.io/ralph-playbook](https://ClaytonFarr.github.io/ralph-playbook/) -- Formatted guide version

### Articles Referenced

- [Jason Cohen - Simple, Lovable, Complete (SLC)](https://longform.asmartbear.com/slc/) -- Release criteria framework
- [Nielsen Norman Group - User Story Mapping](https://www.nngroup.com/articles/user-story-mapping/) -- Activity-based planning

## Related Sources

- [Ralph Wiggum as a "Software Engineer"](../blog-ralph-wiggum-technique/) -- Original technique that this playbook organizes
- [Everything is a Ralph Loop](../blog-everything-is-a-ralph-loop/) -- Philosophical vision this playbook operationalizes
- [Advanced Context Engineering](../blog-advanced-context-engineering/) -- Context engineering strategies incorporated here
- [A Brief History of Ralph](../blog-brief-history-of-ralph/) -- Historical context for the technique's evolution
- [Ralph Wiggum Showdown](../video-ralph-wiggum-showdown/) -- Video comparing bash-loop vs plugin approaches
