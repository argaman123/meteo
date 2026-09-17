---
name: design-first-concise
description: "Standing working style — be concise, design-first, don't touch the lead's own code, commit only on approval"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 32d4e30f-ca9b-412d-b840-592f73bd8b3f
  modified: 2026-08-06T12:16:20.805Z
---

Standing rules the lead set 2026-06-15 (apply project-wide, not just particles):

- **Be concise — but the issue is sentence length, not formatting.** The lead said I am "wayyyy too talky" and (2026-06-16) "speak less, sentences are too long, you're not getting to the point." He explicitly clarified tables/structure are fine and welcome. So: short sentences, lead with the point, keep tables — just stop padding. **Calibration (2026-06-17): the right level is ~1–3 short sentences per answer** — e.g. "one place: file:line. It pads visible bounds and sets requestBounds, so small pans don't refetch." He twice approved this; do not drift back up.
- **Design-first for engine/architecture.** Explain code choices *in chat* (never in code comments — comments still banned), justify every constant in chat, get sign-off before building. Treat the particle renderer/engine as a crucial proof-of-concept for the whole system.
- **Prefer creative redesign over mimicking existing code** — but only *my own* code. Never redesign code the lead writes himself; offer suggestions, don't change them.
- **Commit only when the lead approves.** Committed = agreed baseline. Build uncommitted → show → commit on OK. **Sharpened 2026-07-15 (he had to demand a revert):** "finish this step" / "looks great" ≠ commit authorization — he reviews the UNCOMMITTED diff in his IDE first, and notes/corrections during review are part of the step. Commit only on an explicit "commit" AFTER his code pass; when ambiguous, leave the tree dirty and ask nothing — he'll say the word. **Re-sharpened 2026-08-06 (violated again for git convenience):** when an approved change must be committed but unapproved work sits in the tree, STASH the unapproved work (or rebuild the approved diff on a clean base) — never commit unreviewed code to make sequencing easier ("no why did you commit the satellites?? you could have stashed").
- **Explaining code = file names + a one-line purpose each.** When walking him through code, just name each file and what it's for. Do NOT narrate chunk-by-chunk, flag "tricky" parts, or justify/defend decisions — he reads the code himself and asks if he hits difficulty. (Corrected me 3× toward this on 2026-06-16.)

**Why:** code quality is the top priority, above speed and backward-compatibility. **How to apply:** short messages; propose → approve → build → show → commit-on-ok. See [[concise-ask-dont-choose]].
