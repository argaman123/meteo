---
name: playwright-renders-webgl
description: Playwright MCP renders WebGL headless — the real instrument for verifying map visuals; the embedded Browser pane cannot composite
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 48f076e4-f095-4021-a876-d87ad7853899
  modified: 2026-08-24T09:35:07.220Z
---

The embedded Browser pane never composites (no rAF, screenshots fail), so map/deck visuals are unverifiable there. The Playwright MCP browser DOES render WebGL headless: navigate to the lead's :4200 serve, click layers via browser_evaluate, browser_take_screenshot, and Read the jpeg. This turned "ask the lead to eyeball it" into a self-serve repro/verify loop (used to isolate the dead contour labels, 2026-08-02).

**Why:** visual bugs were previously undiagnosable without the lead's eyes; [[browser-pane-read-page-clicks]] and the pane's no-composite limit blocked everything.

**How to apply:** for any "X doesn't show / looks wrong" map report, reproduce in Playwright first — toggle suspects one at a time and screenshot each state. Delete the repro jpegs + .playwright-mcp/ from the repo root afterward. Note: deck's CollisionFilterExtension is silently broken (filters ALL labels) under interleaved MapboxOverlay with beforeId layer-groups — removed from contours; avoid it while the two-group split exists.

2026-08-19: a long-lived headless Playwright browser degrades — screenshots start timing out
("waiting for fonts" then hang) and ALL CSS transitions freeze at currentTime 0 ("running", never
advancing), which perfectly mimics an app bug. Before diagnosing impossible rendering behavior,
close the browser and retest fresh — the meteo switch "wedged transition" cost several probes
before the fresh instance animated perfectly.

2026-08-24: same degradation, another face — after an HMR-triggered reload the stale instance
rendered at ~1 fps (two rAFs took 1.7s) and every screenshot timed out, looking exactly like the
app perf-collapsed. Fresh instance: 120 fps. Diagnostic: time two rAFs via evaluate; if slow,
restart the browser before suspecting the app.
