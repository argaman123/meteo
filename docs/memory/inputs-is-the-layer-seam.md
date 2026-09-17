---
name: inputs-is-the-layer-seam
description: Layers get platform state ONLY through Inputs — never injector.get(TimeService) or other domain services in fetch; the injector door is for infra like HttpClient
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 48f076e4-f095-4021-a876-d87ad7853899
  modified: 2026-08-02T13:25:49.292Z
---

Layers receive platform state (time, bbox, window, zoom) exclusively through the `Inputs` object; `injector.get` inside `Layer.fetch` is for infrastructure only (`HttpClient`). Injecting `TimeService` (or any domain service) in a layer drew: "since when are we injecting timeservice directly on fetch?? is it not the only reason for Inputs??" (2026-08-02).

**Why:** Inputs IS the deliberate seam between the platform and layer definitions — bypassing it dissolves the boundary that keeps layers junior-writable and service-blind. Related: he equally rejects the opposite failure of stuffing Inputs with niche members ("inputs is spammed") — Inputs stays the universal few; a niche need means the design is wrong, not that a new member or a service reach-around is fine. See [[code-design-taste]], [[layer-look-pipeline]].

**How to apply:** when a layer seems to need a service signal, first simplify the requirement (his satellite answer: anchor asks to `on.time()` instead of needing live/now at all). If it's genuinely universal, propose adding it to Inputs — his call.
