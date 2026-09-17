---
name: flag-problems-never-gate
description: "Mention every problem you see, but never let a concern silently block or water down the work — especially never sacrifice looks for performance"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 12a265ed-7bda-46a1-96a7-f46812649e33
---

The meteo lead (2026-07-06, after I skipped backdrop-blur "for the iGPU budget"): "if you see a
problem just mention it, dont dodge it completely... 'say' when you see a problem, but dont ever
let it be in your path." And on looks specifically: "dont save anything on looks" — the slow fleet
machines are only a couple of users; features/effects can scale down for them (quality knobs)
rather than capping the design for everyone.

**Why:** silently designing around a concern hides the trade-off from him; he wants to make those
calls himself, and my conservatism reads as dodging.

**How to apply:** build the best version, state the concern in one honest sentence alongside it
(cost, risk, rollback), and keep moving. Applies beyond perf: any hesitation gets voiced, not
baked into a weaker deliverable. Complements [[flag-unconventional-choices]] and
[[adopt-library-look]].
