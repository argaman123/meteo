---
name: dev-tooling-no-approval
description: "Dev tooling (perf HUD, diagnostics, dev/ widgets) can be built and added autonomously — never ask approval for dev stuff"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 12a265ed-7bda-46a1-96a7-f46812649e33
---

The meteo lead (2026-07-06, when offered the perf HUD as a next-task option): "you can add perf
hud without even asking, its dev stuff dont ask."

**Why:** approval-gating is for product decisions (features, looks, architecture); developer-facing
tooling has no design stakes he cares to review up front.

**How to apply:** when a dev-facing aid (perf HUD, diagnostics, fixtures plumbing, dev widgets in
`dev/`) is useful, just build it and mention it in the summary. Product features still follow
plan → approve → build. Complements [[flag-problems-never-gate]].
