---
name: use-leads-dev-server
description: "Verify against the lead's own dev server on port 4200 when it's running; never spawn a second server alongside it"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 3d3fb905-26ad-4354-9858-7491977c7da0
  modified: 2026-07-28T08:27:33.655Z
---

The lead usually runs `npm start` himself on port 4200. Starting my own dev server each session doubles RAM and annoyed him (2026-07-28: "cant you use the one im running manually on port 4200?").

**Why:** two ng-serve processes of the same app waste ~1-2 GB and rebuild twice on every edit.

**How to apply:** before verifying, check if 4200 already serves the app (Playwright/preview navigate to http://localhost:4200 — his watcher hot-reloads my edits automatically). Use the `attach` entry in `.claude/launch.json` (url-only, no command) for the Browser pane. Only start the `meteo` launch config when 4200 is down, and stop it when done. See [[browser-pane-read-page-clicks]], [[ng-build-is-the-template-gate]] — the stale-bundle caution applies to HIS server too: check that his watcher picked up the latest edit (bundle timestamp / behavior probe) before trusting live checks.
