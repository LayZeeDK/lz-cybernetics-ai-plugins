# Plan: Complete Cybernetics Concept-to-Enhancement Coverage

## Goal

Ensure `research/ralph-loop/CYBERNETICS-ANALYSIS.md` has:

1. All pre-existing cybernetics concepts documented in theory sections (VERIFIED: 24 concepts present)
2. All 10 new cybernetics concepts documented in theory sections (VERIFIED: added in commit `921c3ed`)
3. Architecturally significant enhancements for ALL concepts -- pre-existing AND new (INCOMPLETE: 8 of 10 new concepts lack explicit enhancement subsections)

## Current State (Phase 0 Audit Summary)

### Theory Sections: COMPLETE (34 concepts across 9 sections)

| Section | Line Range | Concepts | Status |
|---------|-----------|----------|--------|
| First-Order Cybernetics | 5-263 | Feedback, Stop Hook, Backpressure, Requisite Variety, Damping, Homeostasis, **Ultrastability**, **Black Box**, **Good Regulator**, **Channel Capacity** | Complete |
| Second-Order Cybernetics | 265-391 | Observer Inclusion, Autopoiesis, Eigenforms, **Structural Determinism**, **Ethical Imperative** | Complete |
| Management Cybernetics | 393-541 | VSM (Systems 1-5, 3*), **Algedonic Signals**, POSIWID, **Redundancy of Potential Command** | Complete |
| Conversation Theory | 543-563 | Teachback, Entailment Mesh | Complete |
| Ecological Cybernetics | 565-627 | **Levels of Learning**, **Double Bind** | Complete |
| Externalization Paradigm | 629-674 | Comparator externalization, Environment as controller, External state, Disposable plan | Complete |
| Cybernetic Pathologies | 676-730 | Overbaking, Oscillation, Context Rot, Entropy Acceleration | Complete |

**Bold** = new concepts added in commit `921c3ed`

### Enhancement Subsections: INCOMPLETE (7 of 15 needed)

**Pre-existing (5) -- covering 24 pre-existing concepts:**

| # | Enhancement | Covers Concepts |
|---|------------|----------------|
| 1 | Ralph Patterns -> Plugin Hooks | Feedback loops, Stop Hook, Backpressure, Context rotation, External memory |
| 2 | Governor Enhancement | Damping, Requisite Variety, Eigenforms, POSIWID |
| 3 | Backpressure Plugin | Negative feedback, Acceptance-driven gates, Entropy acceleration |
| 4 | Autopoietic Learning Plugin | Autopoiesis, Observer inclusion, Eigenforms |
| 5 | VSM Dashboard | VSM Systems 1-5, 3*, Homeostasis |

**New (2 of 10) -- covering 2 of 10 new concepts:**

| # | Enhancement | Covers Concept |
|---|------------|---------------|
| 6 | Black Box Verification | Black Box Methodology (Ashby) |
| 7 | Ethical Variety Monitor | Ethical Imperative (Von Foerster) |

**Missing (8 of 10) -- the gap this plan closes:**

| # | Enhancement Needed | Covers Concept | Inline implication at |
|---|-------------------|---------------|----------------------|
| 8 | Ultrastable Iteration | Ultrastability (Ashby) | Line ~186 |
| 9 | Good Regulator Maintenance | Good Regulator Theorem (Conant-Ashby) | Line ~230 |
| 10 | Channel Capacity Monitor | Channel Capacity (Shannon) | Line ~263 |
| 11 | Algedonic Channel | Algedonic Signals (Beer) | Line ~498 |
| 12 | Redundancy Audit | Redundancy of Potential Command (Beer) | Line ~541 |
| 13 | Learning Level Tracker | Levels of Learning (Bateson) | Implicit in L-I/L-II analysis |
| 14 | Double Bind Detector | Double Bind (Bateson) | Line ~627 |
| 15 | Structural Context Engineering | Structural Determinism (Maturana) | Implicit in loading-order discussion |

### Key Insights: 14 (needs expansion to cover new enhancements)

Insights #11-14 cover: Black Box, Double Bind, Learning Levels, Good Regulator.
Missing from insights: Ultrastability, Channel Capacity, Algedonic Signals, Redundancy, Structural Determinism.

---

## Phase 1: Add 8 Missing Enhancement Subsections

**File:** `research/ralph-loop/CYBERNETICS-ANALYSIS.md`
**Location:** Insert after `### 7. Ethical Variety Monitor` (~line 802), before `## Key Insights for Plugin Architecture` (~line 804)

Each subsection follows the established format:
- `### N. Enhancement Name` heading
- 1-2 sentence description referencing the cybernetic concept and section
- 4-5 bullet points describing concrete Claude Code plugin behaviors
- `Maps to:` line referencing the theory section

### Enhancement #8: Ultrastable Iteration

A plugin implementing Ashby's two-tier adaptive architecture -- fast homeostatic loop for normal iteration, slow structural loop triggered by repeated failure:

- **Limit cycle detection**: Track error signatures across iterations; when the same error class recurs 3+ times, classify as homeostatic failure
- **Structural change triggers**: Auto-regenerate implementation plan, rotate prompt strategy, or escalate to human with diagnostic
- **Step-function threshold**: Configurable trigger for switching from "adjust parameters" (normal iteration) to "change structure" (plan regeneration, guardrail addition)
- **Escalation with context**: When escalating, include the detected pattern, failed approaches, and suggested structural changes

Maps to: [Ultrastability](#ultrastability) section. The fast loop is the bash iteration; the slow loop is structural adaptation that the human currently performs manually.

### Enhancement #9: Good Regulator Maintenance

A plugin implementing the Conant-Ashby theorem -- continuously verifying that the agent's model (plan, AGENTS.md, progress state) matches the system it regulates (actual codebase):

- **Plan-reality divergence detection**: After each iteration, compare `IMPLEMENTATION_PLAN.md` assertions against actual file state (do files listed exist? are "completed" tasks reflected in code?)
- **Divergence scoring**: Compute a model-accuracy metric; trigger plan regeneration when score drops below threshold
- **Operational guide validation**: Verify that `AGENTS.md` commands (build, test, lint) actually work against current project state
- **Cheap regeneration over expensive repair**: When model divergence is high, regenerate the entire plan (one planning iteration) rather than patching incrementally

Maps to: [The Good Regulator Theorem](#the-good-regulator-theorem) section. The theorem *proves* that stale models cause regulation failure; this plugin makes the proof actionable.

### Enhancement #10: Channel Capacity Monitor

A plugin implementing Shannon's information theory -- tracking context *quality* (signal-to-noise ratio) rather than just context *quantity* (token utilization percentage):

- **Content classification**: Categorize context content as signal (specs, relevant code, progress state) or noise (error logs, failed-attempt residue, stale information, irrelevant code)
- **SNR-based rotation trigger**: Trigger context rotation when signal-to-noise ratio drops below threshold, regardless of utilization percentage
- **Compaction risk assessment**: Warn when compaction would compress below critical rate (risk of losing essential signal along with noise)
- **Quality-aware utilization**: Distinguish "50% utilized, clean context" (healthy) from "50% utilized, half noise" (degraded) -- same percentage, different system health

Maps to: [Channel Capacity and the Context Window](#channel-capacity-and-the-context-window) section. Replaces the heuristic "40-60%" with a principled information-theoretic framework.

### Enhancement #11: Algedonic Channel

A plugin implementing Beer's emergency bypass -- severity-aware signals that eject from the loop rather than iterating on catastrophic failures:

- **Algedonic condition detection**: Monitor for existential threats: all tests failing (catastrophic regression), security vulnerabilities exposed, token burn rate exceeding budget, identical errors across N consecutive iterations
- **Bypass vs backpressure**: Distinguish normal backpressure ("try again, tests failed") from algedonic signals ("stop trying, escalate to human"). Different mechanisms, different timescales
- **Automatic halt and diagnostic**: When algedonic condition detected, halt the loop, preserve state for diagnosis, and alert the human with the detected condition and suggested recovery
- **Configurable severity thresholds**: Let operators define what constitutes "pain" for their project (e.g., >$X token spend, >N iterations without progress, specific error patterns)

Maps to: [Algedonic Signals: The Emergency Bypass Channel](#algedonic-signals-the-emergency-bypass-channel) section. No current Ralph implementation has this channel; all feedback flows through normal iteration.

### Enhancement #12: Redundancy Audit

A plugin implementing Beer's redundancy of potential command -- verifying that feedback channels are truly independent and that no single-point-of-failure blinds the system:

- **Channel independence analysis**: Audit backpressure layers (types, tests, lint, build) for shared blind spots -- do all channels derive from the same specification?
- **Correlated failure detection**: Identify when a single root cause (e.g., a specification error) could pass through all verification channels undetected
- **Spec-independent channel**: Verify at least one feedback channel evaluates from first principles (architectural fitness, behavioral smoke tests) rather than spec-derived requirements
- **Coverage gap reporting**: Surface areas where no backpressure channel provides feedback (e.g., accessibility, error handling paths, edge cases)

Maps to: [Redundancy of Potential Command](#redundancy-of-potential-command) section. Redundancy without independence is cybernetic theater -- five channels that share the same blind spot provide no more safety than one.

### Enhancement #13: Learning Level Tracker

A plugin implementing Bateson's learning hierarchy -- classifying system behavior by learning level and prescribing the correct intervention type:

- **Level classification**: Track whether the system is operating at L-I (iterative error correction within fixed strategy), L-II (strategy repertoire change via guardrails/spec revision), or L-III (meta-level restructuring)
- **L-I stagnation detection**: When the same failure *class* (not specific error) recurs across iterations, diagnose as L-I problem requiring L-II intervention
- **L-II event tracking**: Log guardrail additions, spec revisions, prompt restructuring as Learning II events; measure their effectiveness across subsequent iterations
- **Intervention prescription**: When L-I stagnation detected, suggest specific L-II actions (add guardrail, revise spec, restructure prompt) rather than allowing continued futile iteration

Maps to: [Levels of Learning](#levels-of-learning) section. Learning I cannot solve Learning II problems; this plugin detects the mismatch and prescribes the correct level of intervention.

### Enhancement #14: Double Bind Detector

A plugin implementing Bateson's double bind theory -- analyzing the constraint space for logical contradictions that cause oscillation no amount of guardrails can fix:

- **Constraint extraction**: Parse specs, guardrails, and `AGENTS.md` for imperatives (must/must-not/should/should-not)
- **Contradiction detection**: Check for mutual exclusivity between constraints (e.g., "implement feature X" + "don't modify files outside scope" when X requires shared utility changes)
- **Differential diagnosis**: When oscillation is detected, distinguish amnesiac oscillation (agent forgets failed approaches -- needs hysteresis) from double-bind oscillation (constraints contradict -- needs resolution)
- **Human-surfacing**: Present detected contradictions to the operator with the conflicting constraints and suggested resolution paths

Maps to: [The Double Bind](#the-double-bind) section. Adding guardrails to a double-bind situation makes it worse; this plugin detects the condition so the correct treatment (constraint resolution, not more constraints) can be applied.

### Enhancement #15: Structural Context Engineering

A plugin implementing Maturana's structural determinism -- treating context loading as structural configuration of the agent rather than information delivery:

- **Loading order enforcement**: Define and enforce context loading order: identity first (specs, JTBD), constraints second (guardrails, AGENTS.md), state third (progress, plan), environment last (source code)
- **Negative example warnings**: Detect guardrails phrased as "do NOT do X" and warn that this loads the prohibited pattern into the agent's structural repertoire; suggest "do Y instead" phrasing
- **Structural reset verification**: After context rotation, verify the fresh context is loaded in the correct structural order to configure the agent appropriately
- **Context-as-configuration audit**: Track which files are loaded and in what order; flag sessions where source code is loaded before specs (structural misconfiguration)

Maps to: [Structural Determinism](#structural-determinism) section. Loading files into context *reconfigures the agent's behavioral repertoire*, not merely "informs" it; loading order determines which structural responses are available.

### Verification Checklist for Phase 1

- [ ] `grep -c "^### [0-9]" research/ralph-loop/CYBERNETICS-ANALYSIS.md` returns 15
- [ ] Each new subsection (8-15) has: heading, description paragraph, 4-5 bullet points, "Maps to:" reference
- [ ] New subsections are inserted between `### 7. Ethical Variety Monitor` and `## Key Insights`
- [ ] No pre-existing content modified

---

## Phase 2: Add 5 Missing Key Insights

**Location:** Insert after Key Insight #14 (~line 832), before `## Sources` (~line 834)

Five new concepts lack coverage in Key Insights: Ultrastability, Channel Capacity, Algedonic Signals, Redundancy, Structural Determinism.

### New Insights to Add

**15.** **Ultrastability requires two loops:** When homeostatic adjustment fails (limit cycle detected), the system must change its own feedback structure, not just its parameters. The fast loop adjusts code; the slow loop changes guardrails, plans, and prompt strategy. A system with only the fast loop eventually gets stuck in a limit cycle it cannot escape.

**16.** **Track signal quality, not just quantity:** Shannon's channel capacity theorem predicts that context *quality* (signal-to-noise ratio) matters more than context *size* (utilization percentage). A 30% utilized context full of error logs is more degraded than a 70% context with clean state. Trigger rotation on SNR, not token count.

**17.** **Algedonic signals bypass normal iteration:** Some failures are too severe for "try again." Catastrophic regression, security vulnerabilities, and runaway cost require ejection from the loop, not another iteration. Backpressure corrects within the loop; algedonic signals eject from it.

**18.** **Redundancy without independence is theater:** Multiple feedback channels that share the same blind spot provide false confidence. If all verification derives from the same specification, a spec error passes through every channel. At least one channel must evaluate from first principles, independent of the spec.

**19.** **Context is structure, not information:** Maturana's structural determinism means loading files into context *reconfigures the agent's behavioral repertoire*, not merely "informs" it. Loading order matters -- specs before code produces a different agent than code before specs. Negative examples ("don't do X") activate the prohibited pattern. Fresh context is structural reset, not memory wipe.

### Verification Checklist for Phase 2

- [ ] `grep -c "^\*\*[0-9]" research/ralph-loop/CYBERNETICS-ANALYSIS.md` in Key Insights section returns 19
- [ ] Each new insight (15-19) references its cybernetic source by name
- [ ] All 10 new concepts appear in at least one insight (some may share insights with enhancement subsections)

---

## Phase 3: Add Concept-to-Enhancement Mapping Table

**Location:** Insert at the beginning of the "Implications for Plugin Development" section, after the introductory paragraph (~line 733), before `### 1. Ralph Patterns`

Add a comprehensive mapping table that serves as a navigation aid and completeness verification:

```markdown
### Concept-to-Enhancement Map

Every cybernetics concept documented in this analysis maps to at least one architecturally significant enhancement:

| Cybernetic Concept | Theorist | Enhancement(s) |
|-------------------|----------|----------------|
| Negative feedback / Feedback loops | Wiener | #1 Plugin Hooks, #3 Backpressure |
| Stop Hook as comparator | (architectural) | #1 Plugin Hooks |
| Backpressure | Huntley | #1 Plugin Hooks, #3 Backpressure |
| Requisite Variety | Ashby | #2 Governor |
| Damping / Speed Limit | Pocock | #2 Governor |
| Homeostasis / Auto-Heal | (application) | #5 VSM Dashboard |
| **Ultrastability** | **Ashby** | **#8 Ultrastable Iteration** |
| **Black Box Methodology** | **Ashby** | **#6 Black Box Verification** |
| **Good Regulator Theorem** | **Conant-Ashby** | **#9 Good Regulator Maintenance** |
| **Channel Capacity** | **Shannon** | **#10 Channel Capacity Monitor** |
| Observer Inclusion | Von Foerster | #4 Autopoietic Learning |
| Autopoiesis | Maturana/Varela | #4 Autopoietic Learning |
| Eigenforms | Von Foerster | #2 Governor, #4 Autopoietic Learning |
| **Structural Determinism** | **Maturana** | **#15 Structural Context Engineering** |
| **Ethical Imperative** | **Von Foerster** | **#7 Ethical Variety Monitor** |
| VSM (Systems 1-5, 3*) | Beer | #5 VSM Dashboard |
| **Algedonic Signals** | **Beer** | **#11 Algedonic Channel** |
| POSIWID | Beer | #2 Governor |
| **Redundancy of Potential Command** | **Beer** | **#12 Redundancy Audit** |
| Teachback | Pask | #4 Autopoietic Learning |
| Entailment Mesh | Pask | (architectural principle) |
| **Levels of Learning** | **Bateson** | **#13 Learning Level Tracker** |
| **Double Bind** | **Bateson** | **#14 Double Bind Detector** |
| Externalization Paradigm | (synthesis) | #1 Plugin Hooks, #6 Black Box |
| Compaction / Variety Reduction | Ashby | #2 Governor, #10 Channel Capacity |
| Entropy Acceleration | Pocock | #3 Backpressure, #7 Ethical Variety |
```

Bold rows = 10 new concepts added in commit `921c3ed`.

### Verification Checklist for Phase 3

- [ ] Table has one row per documented concept (at least 24 rows)
- [ ] Every row has at least one enhancement reference
- [ ] Every enhancement (#1-#15) appears in at least one row
- [ ] Bold formatting highlights the 10 new concepts

---

## Phase 4: Update PLUGIN-GUIDE.md Cross-References

**File:** `research/ralph-loop/PLUGIN-GUIDE.md`

The PLUGIN-GUIDE.md references CYBERNETICS-ANALYSIS.md as a prerequisite (line 5). After adding 8 new enhancement subsections and the mapping table, update PLUGIN-GUIDE.md's references:

- Verify the `[CYBERNETICS-ANALYSIS.md]` link text matches the actual document title
- Add brief mentions of new enhancements where PLUGIN-GUIDE.md discusses related concepts (e.g., context rotation section could reference Channel Capacity Monitor; backpressure section could reference Redundancy Audit)
- Do NOT duplicate enhancement content -- reference only

### Verification Checklist for Phase 4

- [ ] All cross-references from PLUGIN-GUIDE.md to CYBERNETICS-ANALYSIS.md resolve correctly
- [ ] No broken markdown links
- [ ] No content duplication between documents

---

## Final Phase: Verification

### Completeness Checks

```bash
# Count enhancement subsections (should return 15)
grep -c "^### [0-9]" research/ralph-loop/CYBERNETICS-ANALYSIS.md

# List all enhancement headings
grep "^### [0-9]" research/ralph-loop/CYBERNETICS-ANALYSIS.md

# Count Key Insights (should return 19)
grep -c "^\*\*[0-9]" research/ralph-loop/CYBERNETICS-ANALYSIS.md

# Count "Maps to:" references in new enhancements (should return 10, for #6-#15)
grep -c "Maps to:" research/ralph-loop/CYBERNETICS-ANALYSIS.md

# Verify line count is reasonable (target: ~1050-1100 lines)
wc -l research/ralph-loop/CYBERNETICS-ANALYSIS.md

# Verify all 10 new theorists appear in Sources
grep -c "Bateson\|Shannon\|Conant\|Maturana\|Foerster" research/ralph-loop/CYBERNETICS-ANALYSIS.md
```

### Quality Checks

- [ ] Each new enhancement subsection (#8-15) has 4-5 concrete, actionable bullet points
- [ ] Each new Key Insight (#15-19) is 1-2 sentences, references theorist by name
- [ ] Mapping table covers all 34 concepts with no gaps
- [ ] No pre-existing content (enhancements #1-5, insights #1-14) was modified
- [ ] Document reads coherently from theory → enhancements → insights → sources

### Anti-Pattern Guards

- Do NOT modify theoretical sections (Phases 1-3 only touch Implications, Key Insights, and mapping table)
- Do NOT remove or renumber pre-existing enhancements (#1-5) or insights (#1-14)
- Do NOT split into multiple documents unless final line count exceeds ~1200 lines
- Do NOT create enhancement subsections without "Maps to:" back-reference to theory section
- Do NOT add enhancements that merely restate the theory -- each must describe concrete *plugin behavior*

---

## Summary

| Deliverable | Before | After |
|------------|--------|-------|
| Theory concepts | 34 | 34 (unchanged) |
| Enhancement subsections | 7 | 15 (+8) |
| Key Insights | 14 | 19 (+5) |
| Mapping table | none | 1 (24+ rows) |
| PLUGIN-GUIDE.md cross-refs | partial | complete |
| Estimated line count | 858 | ~1080 |
