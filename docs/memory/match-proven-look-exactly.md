---
name: match-proven-look-exactly
description: "When the lead points to a specific old commit as the target look/behavior, restore that exact algorithm — don't rebuild a \"cleaner\" equivalent"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 32d4e30f-ca9b-412d-b840-592f73bd8b3f
  modified: 2026-07-28T12:56:14.905Z
---

When the lead references a specific old commit as the target look or behavior (e.g. "check how it looked in 0d9c97b"), restore **that exact algorithm**, not a re-abstracted or "improved" equivalent. Twice on the wind particles I kept a different mechanism (precomputed centerline-riding) and tried to patch it toward the old look; both times he said it "doesn't look even close." The fix was porting the proven old code verbatim (cell-cadence emission, free advection through the field, fixed-distance trail sampling, sideways containment).

**Why:** he values the proven visual result above architectural elegance. An approximation of a look he already perfected reads as a regression, and patching the wrong mechanism wastes round-trips. He explicitly said "i dont care if you need to revert and run or whatever" — reverting to known-good is welcome, not a failure.

**How to apply:** if a request names an old commit/version as the bar, `git show <commit>:<path>` and port the real logic with its constants intact; verify the behavior matches (numerically if WebGL screenshots time out) before declaring done. Keep the base abstraction from *imposing* a lifecycle the specific layer never had — provide infrastructure, let the strategy own its `step()`. Related: [[design-first-concise]], [[flag-unconventional-choices]].

**Same rule for screenshot references (2026-07-07, contour labels):** when he pastes a reference image (e.g. windy.com), describe its exact structure first — what's filled vs stroked, what sits on top of what, text color — and replicate that literally. I read windy's isoline label as "line opens into an oval ring" and built that; it was actually a filled rounded white chip ON TOP of the line with black text, and the loose interpretation got an angry "wtf am i looking at". Zoom into the reference crop before building, and compare my result against it side by side before presenting.

**For reference GEOMETRY, trace programmatically — never eyeball (2026-07-28, Israel borders):** three rounds of hand-placing "calibrated" vertices from a reference map all got "not at all / horrible"; he asked directly "can't you run a command and get the coordinates?". The winning pipeline: have him save the image to disk → mask the target color (sample actual pixel RGBs first — assumptions were wrong), largest connected component, Moore contour trace, RDP simplify (split closed rings before RDP or it collapses), georeference by auto-calibrating on a known waterbody's pixel bbox (Kinneret; its mercator aspect ratio validates the fit). Also: when a traced/vendored line coincides with an already-drawn basemap line, cut it at the meeting point — near-parallel doubles read as "overlapping" braiding he immediately flags.
