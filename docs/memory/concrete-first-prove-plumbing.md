---
name: concrete-first-prove-plumbing
description: "Build the concrete simplest thing to prove the architecture; don't lead with an abstract system"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: cd8b4020-41c8-496d-b461-8cea9ee44b48
---

When adding a capability (e.g. wind particles), build the **concrete, simplest** version first to prove the plumbing works — not a generic/parameterized system. He rejected a generic `Particles<I>` look with options/knobs ("not an abstract system... make a windlayer") and repeatedly pushed to "create the simplest version you can." His stated interest was often the *architecture* ("is the Look class capable of particles, does multi-parameter support work"), not a polished result.

**Why:** premature abstraction + lots of code/files reads as complexity and hides whether the core wiring actually works. He wants to see the plumbing proven in the fewest lines, then generalize later if ever. He also dislikes large restored code even when it's the exact old algorithm — simplicity can outrank fidelity to the proven look when the goal is validation. (Contrast [[match-proven-look-exactly]]: exact restoration is for when he explicitly wants the old look; when he says "simplify," simplicity wins.)

**How to apply:** default to one small file, concrete types, minimal algorithm. Prove the capability end-to-end (it renders, it animates, params flow) before adding polish or generality. He steers by editing files directly (renaming, inlining constructors at call sites to match a sibling like `Colormap`) — read those edits as taste signals and propagate them. Pairs with [[inline-tuning-literals]], [[code-design-taste]], [[design-first-concise]].
