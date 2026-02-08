# Learning III Prompt: Autopoietic Document Architecture

Use with: `/claude-mem:make-plan <this prompt>`
Run after: `cybernetics-enhancements-tradition-grouping.plan.md` (Learning II) has been implemented.
Output to: `plans/cybernetics-autopoietic-document-architecture.plan.md`

---

## Prompt

Plan to make `research/ralph-loop/CYBERNETICS-ANALYSIS.md` autopoietic -- a document whose organizational structure is derived from and justified by the cybernetic principles it documents. This is a Learning III intervention: not reorganizing content (Learning II), but changing *how we decide how to organize* by grounding every structural decision in the document's own theoretical framework.

### The autopoietic property

After this plan is implemented, a reader should be able to ask "why is this document structured this way?" and receive an answer that cites a cybernetic principle *from the document itself*. The document produces the principles that produce the document's structure.

### Structural decisions to derive from cybernetic principles

For each structural element below, the plan must:
1. Identify which cybernetic principle (documented in the file) justifies it
2. Specify the concrete implementation
3. Define a verification method that is itself cybernetically grounded

| Structural Element | Justify From Which Principle | Question the Plan Must Answer |
|---|---|---|
| **The mapping table** | Good Regulator Theorem (Conant-Ashby) | The table is a model of the document. How do we verify model-reality correspondence? What triggers regeneration? |
| **Verification checklists** | Externalized Comparator (Externalization Paradigm) | Verification must be independent of the author's self-assessment. How do we make checklists machine-checkable (grep, wc, link validation)? |
| **Tradition grouping** | Requisite Variety (Ashby) | Sequential numbering lacks the variety to express lineage relationships. Does the grouping structure have enough variety to match the conceptual structure? Or too much? |
| **Cross-references between sections** | Entailment Mesh (Pask) | Concepts entail each other. Do the cross-references form a mesh, or are they one-directional? Can a reader navigate from any concept to its entailed concepts? |
| **Section ordering** | Structural Determinism (Maturana) | Loading order configures the reader's interpretive structure. Does the document load foundational concepts before concepts that depend on them? |
| **Key Insights as summary** | Channel Capacity (Shannon) | The full document exceeds casual reading capacity. Do the Key Insights function as a compressed signal that preserves essential information? |
| **The Sources section** | Redundancy of Potential Command (Beer) | Multiple independent paths to the same knowledge. Can a reader reach any concept via at least two paths (document section + original source)? |
| **The introduction paragraph** | POSIWID (Beer) | The stated purpose must match the actual structure. Does the introduction accurately describe what the document *does*, not just what it *intends*? |
| **Pathologies section** | Negative Feedback (Wiener) | Failure modes are the negative feedback signals of the framework. Does each pathology map to a specific principle violation? |
| **The document as a whole** | Autopoiesis (Maturana/Varela) | The document produces the principles that structure the document. Is this self-referential loop explicit and verifiable? |

### Scope of structural changes

The plan MAY:
- Add a brief "Document Architecture" preamble explaining the autopoietic property (the document should explain its own structure)
- Restructure cross-references to form a proper entailment mesh (bidirectional)
- Add machine-checkable verification commands to the document itself (as a fenced code block in an appendix)
- Reorder sections if structural determinism analysis reveals a better loading order
- Update the introduction paragraph to reflect POSIWID (actual structure, not aspirational)

The plan MUST NOT:
- Remove or substantially rewrite theoretical content (that was Learning I)
- Change the tradition-grouping of enhancements (that was Learning II)
- Add new cybernetic concepts (the 34 concepts are complete)
- Create new files (the autopoietic property is that ONE document is self-organizing, not that it spawns children)

### The meta-verification

The plan's final phase must verify the autopoietic property itself: for every structural decision made in the plan, there must be a citation to a principle documented in the file. If any structural decision cannot be justified by a principle in the document, either:
- The decision is wrong (remove it), or
- The document is missing a principle (which contradicts the "34 concepts are complete" constraint)

This tension is itself a cybernetic test: the constraint space must be consistent. If it isn't, that's a double bind (Bateson) and must be resolved, not papered over.

### What this produces

A document that is not merely *about* cybernetics but *is* cybernetic. Its structure embodies its content. Its verification mechanisms are externalized comparators. Its mapping table is a Good Regulator's model. Its cross-references are an entailment mesh. Its tradition grouping is requisite variety. Its introduction is POSIWID-compliant. And this self-referential coherence is itself the autopoietic property -- the document produces the principles that produce the document.

This becomes the template for all research documents in `research/` -- not by prescription, but by demonstration. Other documents can ask: "what would CYBERNETICS-ANALYSIS.md do?" and derive their structure from the same principles.
