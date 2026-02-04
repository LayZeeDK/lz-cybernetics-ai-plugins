Below is a **single, self‑contained Markdown plan** you can drop directly into your `lz-cybernetics` plugin repository. It’s written for Claude Code to *implement*, not just read — meaning it’s structured, explicit, and actionable, while still leaving room for your architectural preferences.

---

# `lz-cybernetics` — Cybernetic Skill‑Verifier Plan

This document defines the architecture and implementation plan for a **cybernetics‑based skill‑verifier** integrated into Claude’s plugin hook system. The verifier acts as a closed‑loop controller around all skills, enforcing stability, correctness, and safety through structured observation, evaluation, and feedback.

---

## 1. Goals

- Add a **meta‑controller** that validates and stabilizes all tool calls.  
- Implement a **cybernetic feedback loop**:
  - **Observe** (pre‑hook)
  - **Compare** (validator)
  - **Correct** (post‑hook)
- Detect and mitigate:
  - malformed tool calls  
  - schema violations  
  - unsafe actions  
  - oscillation / repeated failures  
  - contradictions between plan and action  
- Provide structured error signals to Claude for self‑correction.

---

## 2. Folder Structure (assumes existing plugin layout)

```
lz-cybernetics/
  ├── hooks/
  │     ├── pre.js
  │     ├── post.js
  │     └── shared/
  │           ├── schema.js
  │           ├── invariants.js
  │           ├── detectors.js
  │           └── controller.js
  ├── skills/
  │     └── (existing skills unchanged)
  ├── tests/
  │     └── verifier.test.js
  └── README.md
```

---

## 3. Core Components

### 3.1 Observation Layer (`hooks/pre.js`)
Implements the **sensor** portion of the cybernetic loop.

Responsibilities:
- Parse tool call JSON  
- Validate required fields  
- Validate parameter types  
- Check tool name against allowed list  
- Detect repeated patterns (loop detection)  
- Extract plan text (if available) for contradiction checks  
- Produce a raw “observation packet” for the validator

Output shape:

```json
{
  "tool": "string",
  "params": { },
  "plan": "string | null",
  "history": [ ],
  "raw": { }
}
```

---

### 3.2 Evaluation Layer (`hooks/shared/validators.js`)
Implements the **comparator**.

Responsibilities:
- Compare observation packet to:
  - schema invariants  
  - safety rules  
  - allowed/forbidden actions  
  - retry/loop limits  
  - plan/action consistency  
- Produce a structured **error vector**:

```json
{
  "missing_fields": [],
  "invalid_values": [],
  "forbidden_actions": [],
  "loop_detected": false,
  "contradiction": null
}
```

If the vector is empty → stable.  
If not → unstable.

---

### 3.3 Correction Layer (`hooks/post.js`)
Implements the **controller**.

Responsibilities:
- Inspect the error vector  
- Apply one of three strategies:
  1. **Reject** → ask Claude to regenerate  
  2. **Auto‑correct** → fill defaults, normalize values  
  3. **Escalate** → fallback skill or safe‑mode behavior  
- Apply **damping**:
  - limit retries  
  - prevent oscillation  
  - enforce backoff rules  

Output:
- Either a corrected tool call  
- Or a structured rejection message for Claude to fix

---

## 4. Shared Modules

### 4.1 `schema.js`
Defines:
- required fields per tool  
- type constraints  
- default values  
- forbidden fields  

### 4.2 `invariants.js`
Defines global rules:
- allowed tool list  
- safety constraints  
- retry limits  
- max complexity  
- no‑oscillation rules  

### 4.3 `detectors.js`
Implements detectors for:
- malformed JSON  
- hallucinated tools  
- missing fields  
- invalid values  
- repeated patterns  
- contradictions between plan and action  

### 4.4 `controller.js`
Implements:
- rejection logic  
- auto‑correction logic  
- fallback strategies  
- damping/backoff  

---

## 5. Control Loop Summary

```
Claude → pre-hook (observe) → validator (compare) → post-hook (correct) → Claude
```

Loop repeats until:
- output is valid  
- system is stable  
- safety constraints satisfied  

---

## 6. Testing Strategy (`tests/verifier.test.js`)

Test categories:
- valid tool calls  
- missing fields  
- invalid types  
- forbidden actions  
- oscillation detection  
- contradiction detection  
- auto‑correction behavior  
- rejection behavior  
- fallback behavior  

Use snapshot tests for error vectors.

---

## 7. Integration Notes

- The verifier wraps **all** skills automatically.  
- No changes required inside individual skills.  
- The plugin exposes a single entry point that Claude Code can use without modification.  
- The cybernetic loop is deterministic and transparent for debugging.

---
