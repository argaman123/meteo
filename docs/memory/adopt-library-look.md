---
name: adopt-library-look
description: "When adopting a UI library, use its native design language — don't restyle it to mimic the app's previous look"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 12a265ed-7bda-46a1-96a7-f46812649e33
---

When the meteo lead adopts a design-opinionated library (spartan/ui, 2026-07-06), he wants its
distinct out-of-the-box look used properly ("use what looks best"), not the library bent to match
the pre-existing custom styling.

**Why:** preserving the old look "just so it matches what was already made" creates a hybrid that
is neither consistent nor simple; the library's design system is the new baseline.

**How to apply:** style new/rebuilt UI with the library's idioms (its tokens, variants, surfaces,
radius/shadow scale); delete superseded custom tokens instead of keeping both. This complements
[[match-proven-look-exactly]] — that rule is about *algorithms/behavior* when he names an old
commit as the target; visual chrome follows the adopted library instead.
