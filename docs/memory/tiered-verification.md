---
name: tiered-verification
description: Lead-chosen verification calibration — tier checks to the change type and batch during rapid review; full live pass only where behavior could change
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 48f076e4-f095-4021-a876-d87ad7853899
  modified: 2026-08-23T12:33:31.612Z
---

The lead asked why every small review edit triggered a full build+browser round ("why are there so
many checks after each small question") and chose **tiered + batched** verification (2026-07-30):

- **Renames / type shuffles / pure refactors** → `ng build` only. A rename can't break what the
  build wouldn't catch; the browser pass after it is theater.
- **One-line tuning/config tweaks whose outcome is certain** (a font weight, a width constant, a
  color literal) → `ng build` only, even though they're "visual" — the lead judges the look on his
  own screen anyway (2026-08-23: "you change one simple line, the fix will sure work, and youre
  still taking a couple of minutes to verify using playwright"). Playwright/screenshot rounds are
  reserved for when HE reports an issue to reproduce, or when building something genuinely visual
  and new whose rendering is actually in doubt.
- **Behavior changes** → build + ONE live probe of the affected path (not the full journey).
- **Wire/fetch/reactivity changes** → the full round: build, served-bundle check when staleness is
  suspected ([[ng-build-is-the-template-gate]]), live probe, console.
- **Rapid review back-and-forth** (his question-per-message mode) → batch small edits and verify
  once at natural pauses / before commit, not per edit.

**Why:** per-edit full verification slowed his review loop; the paranoia was a reaction to two
silent failures (stale serve bundle, the zero-output hours refetch loop) but the right calibration
is tiering, not maximal checking. The harness's per-edit verify nudge is a prompt, not a mandate.

**How to apply:** classify each change before verifying; when in the review loop, say what tier a
change got and defer live checks until a pause point. See [[persist-feedback-always]].
