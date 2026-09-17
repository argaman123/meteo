---
name: dynamic-task-pool
description: "Planning style — one full task pool with dynamic per-item priorities; no stages, no predefined steps; one small task at a time, commit each"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 56018fbf-c459-429b-9887-86b96b62dd83
---

The lead rejected staged roadmaps twice (slices 2026-07-06, 3-item "agreed next" list 2026-07-07):
predefined STEPS/RULES were "way too harsh and specific", and a tiny curated list "is nothing at
all". What he wants: **one complete pool of every remaining task** (docs/plan.md) with a rough
priority rating next to each — ratings are *dynamic*, Claude adjusts them as the app evolves or
asks. He picks the next task by moment and mood (sometimes a small filler, sometimes proving a
concept) — never infer the pick. Work proceeds one small task at a time, committed after each.

**Why:** he wants a full map of the destination without being locked into an order; rigid
sequencing felt imposed and hid how big the app really is.

**How to apply:** keep plan.md exhaustive, never prune it down to a "next few"; propose priority
changes openly; when a feature finishes, remove it from the pool and record it in CLAUDE.md §11.
Related: [[plan-execution-workflow]], [[concrete-first-prove-plumbing]].
