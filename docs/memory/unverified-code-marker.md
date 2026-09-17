---
name: unverified-code-marker
description: "His `// TODO: UNVERIFIED CODE BELOW` comments mark code he hasn't read yet — never remove or move them; only he clears them"
metadata: 
  node_type: memory
  type: project
  originSessionId: 849d7b34-80ed-4ce0-9070-818782d75312
---

The lead marks code he skipped during review with `// TODO: UNVERIFIED CODE BELOW` (declared 2026-07-08, first placed on the contour tracer in `utils/contours.ts` and the anchor-selection half of `engine/looks/contours.ts`). It means "I didn't read this yet, ensure I come back if necessary" — it is his read-tracking, not a work item for me.

**Why:** he reviews all code personally; dense algorithmic code he defers, and the marker is how he finds it again.

**How to apply:** never delete, move, or "resolve" these comments — only he clears them. When editing marked code, keep the marker above the unread region (extend it downward if new dense code lands under it). This is a deliberate exception to the no-comments rule (CLAUDE.md §2). Related: [[plan-execution-workflow]], [[code-design-taste]].
