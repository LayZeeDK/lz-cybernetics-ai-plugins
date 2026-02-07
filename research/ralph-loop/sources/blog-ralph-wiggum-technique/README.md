# Ralph Wiggum as a "Software Engineer"

- **Author:** Geoffrey Huntley
- **Date:** July 14, 2025 (last modified January 11, 2026)
- **URL:** https://ghuntley.com/ralph/
- **Type:** Blog post

## Article

See [article.md](./article.md) for the full blog post content in Markdown.

## Summary

The original blog post introducing the Ralph Wiggum technique -- a simple Bash loop that continuously feeds a prompt file to an AI coding agent for autonomous software development. Huntley describes it as "deterministically bad in an undeterministic world," meaning its failures are predictable and correctable through prompt refinement.

## Key Concepts

- The core loop: `while :; do cat PROMPT.md | claude-code ; done`
- Progress persists in files and git history, not in the LLM's context window
- The technique requires "a great deal of faith and a belief in eventual consistency"
- Claimed to have delivered a $50,000 USD contract as an MVP for $297 USD
- Works with any tool lacking caps on tool calls and usage
- Named after Ralph Wiggum from The Simpsons (naive persistence, cheerful optimism, unexpected success)

## Referenced Resources

### GitHub Repos

- [repomirror](https://github.com/repomirrorhq/repomirror) -- Reference implementation mentioned in the blog

### Tools / Packages

- `@sourcegraph/amp` -- CLI tool used in the original Ralph bash loop (`npx --yes @sourcegraph/amp`)
- `claude-code` -- Claude Code CLI, used in adapted versions of the loop

## Related Sources

- [Cursed Lang](../blog-cursed-lang/) -- Language created by running Ralph for three months
- [A Brief History of Ralph](../blog-brief-history-of-ralph/) -- Comprehensive history of the technique
- [Ralph Wiggum Showdown](../video-ralph-wiggum-showdown/) -- Video comparing bash-loop vs plugin approaches
- [Everything is a Ralph Loop](../blog-everything-is-a-ralph-loop/) -- Huntley's philosophical follow-up on Ralph as a paradigm shift
- [The Ralph Playbook](../repo-how-to-ralph-wiggum/) -- Community playbook organizing the Ralph technique into a structured guide
