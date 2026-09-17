---
name: browser-pane-read-page-clicks
description: "The Browser pane's read_page intermittently ACTIVATES buttons while snapshotting — it has toggled layers, flipped persisted settings, and opened menus. Verify via javascript_tool clicks + screenshots instead."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 3d3fb905-26ad-4354-9858-7491977c7da0
---

During the dropdown-menu and warnings-layer sessions (2026-07-16), read_page snapshots of the app
intermittently pressed the controls they read: every layer button toggled (weather off, warnings
on), temperature's model flipped to 'local' and persisted, opacity landed on 55%, groups and menus
opened/closed on their own.

**Why:** the a11y snapshot appears to dispatch activation on interactive elements sometimes; the
damage writes into localStorage-persisted settings, so it survives reloads and masquerades as an
app bug.

**How to apply:** on this app, interact via `javascript_tool` (`element.click()`, dispatched
mousemoves, `window.ng.getComponent`) and verify with screenshots + DOM reads; avoid read_page for
state-bearing pages, or treat any post-read_page state as suspect and hard-reload before judging.
Also remember the pane's localStorage is its own profile — resetting `settings.*` keys there never
touches the lead's browser. Related: [[ng-build-is-the-template-gate]].

Second pathology (2026-07-19): the hidden pane starves rAF, so maplibre stops painting — tiles
fetch fine but the canvas shows a stale frame (looks like a black basemap; nearly framed deck's
FillStyleExtension for it). Any repaint fixes it: `window.dispatchEvent(new Event('resize'))`
after load, or any overlay setProps. Pump a frame before judging a screenshot; the lead's visible
browser never sees this.
