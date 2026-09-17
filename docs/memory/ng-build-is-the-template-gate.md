---
name: ng-build-is-the-template-gate
description: tsc --noEmit does NOT type-check Angular templates; only ng build does. Dev server silently serves the last good bundle when rebuilds fail — check preview_logs before trusting live verification.
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 3d3fb905-26ad-4354-9858-7491977c7da0
---

Committed c085abb "verified live" while every dev-server rebuild since 09:09 had been failing on
template type errors — the server kept serving the last good bundle, so the page looked fine while
the committed code didn't compile.

**Why:** `tsc --noEmit` skips Angular template type-checking (strictTemplates runs only in the
angular-compiler plugin), and `ng serve` never crashes on a failed rebuild — it just logs and keeps
serving the previous bundle.

**How to apply:** before declaring verified or committing: (1) run `npx ng build` as the type gate,
never tsc alone; (2) check preview_logs for "Application bundle generation failed" — a working page
proves nothing about the current code; (3) stale incremental state after file moves/renames →
restart the dev server (recurring, third occurrence). Related: [[design-first-concise]].
