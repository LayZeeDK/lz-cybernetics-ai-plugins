# `lz‑cybernetics` — Cybernetic Lifecycle Mapped to File Structure

Below is a **direct, file‑by‑file mapping** of the cybernetic control lifecycle onto the actual `lz‑cybernetics` plugin structure. This shows exactly **which module implements which phase** of the cybernetic loop, and how the whole system fits together inside the Claude plugin architecture.

```
lz-cybernetics/
  hooks/
    pre.mjs
    post.mjs
    shared/
      schema.mjs
      invariants.mjs
      detectors.mjs
      controller.mjs
  skills/
  tests/
  README.md
```

Below is the lifecycle, mapped step‑by‑step to these files.

---

# 1. Model → Proposed Tool Call  
### Cybernetic role: **Raw system output**  
### File: *none* (Claude generates this internally)

Claude produces:
- a plan  
- a tool call  
- parameters  

This is the unregulated output that your plugin will intercept.

---

# 2. Pre‑Hook (Observation Layer)  
### Cybernetic role: **Sensors**  
### File: `hooks/pre.mjs`

This file:
- receives the tool call  
- parses it  
- extracts plan text  
- captures history  
- builds the **observation packet**  

This is the first sensing phase.

---

# 3. Validator (Evaluation Layer)  
### Cybernetic role: **Comparator / Error Signal Generator**  
### Files:
- `hooks/shared/schema.mjs`
- `hooks/shared/invariants.mjs`
- `hooks/shared/detectors.mjs`

These modules collectively:
- compare the observation packet to schema rules  
- check invariants  
- detect forbidden actions  
- detect contradictions  
- detect oscillation  
- produce the **error vector**  

This is the heart of the cybernetic comparator.

---

# 4. Pre‑Hook Controller (Correction Phase 1)  
### Cybernetic role: **Controller (first corrective action)**  
### File: `hooks/pre.mjs` (calls into `controller.mjs`)

If the error vector is non‑empty:
- reject the tool call  
- auto‑correct simple issues  
- escalate to fallback  
- apply retry limits  

If stable:
- allow the tool call to proceed  

This is the first half of the control loop.

---

# 5. Tool Execution  
### Cybernetic role: **System action**  
### File: *none* (Claude executes the tool)

Your plugin does not act here.

---

# 6. Post‑Hook (Observation Layer, Second Pass)  
### Cybernetic role: **Sensors (second sensing phase)**  
### File: `hooks/post.mjs`

This file:
- receives tool result  
- captures execution metadata  
- builds a **post‑execution observation packet**  

This is the second sensing phase.

---

# 7. Post‑Hook Validator (Evaluation Layer, Second Pass)  
### Cybernetic role: **Comparator (second error signal)**  
### Files:
- `hooks/shared/schema.mjs`
- `hooks/shared/invariants.mjs`
- `hooks/shared/detectors.mjs`

These modules validate:
- output shape  
- safety  
- contradictions  
- execution errors  
- retry/oscillation patterns  

They produce a **post‑execution error vector**.

---

# 8. Post‑Hook Controller (Correction Phase 2)  
### Cybernetic role: **Controller (final corrective action)**  
### File: `hooks/post.mjs` (calls into `controller.mjs`)

Based on the error vector:
- return the result (stable)  
- reject and request regeneration (unstable)  
- auto‑correct output  
- escalate to fallback  
- apply damping/backoff  

This completes the cybernetic control loop.

---

# 9. Claude Regenerates (Feedback Loop Completion)  
### Cybernetic role: **Feedback**  
### File: *none* (Claude handles regeneration)

If the verifier rejects the output:
- Claude regenerates  
- The cycle repeats until stable  

This is the closed feedback loop that defines cybernetics.

---

# Summary Table

| Cybernetic Phase | Claude Lifecycle | File(s) |
|------------------|------------------|---------|
| Sensing (1) | Pre‑hook | `hooks/pre.mjs` |
| Comparison (1) | Pre‑validation | `schema.mjs`, `invariants.mjs`, `detectors.mjs` |
| Correction (1) | Pre‑controller | `pre.mjs` + `controller.mjs` |
| System Action | Tool execution | *(none)* |
| Sensing (2) | Post‑hook | `hooks/post.mjs` |
| Comparison (2) | Post‑validation | `schema.mjs`, `invariants.mjs`, `detectors.mjs` |
| Correction (2) | Post‑controller | `post.mjs` + `controller.mjs` |
| Feedback | Claude regeneration | *(none)* |

---
