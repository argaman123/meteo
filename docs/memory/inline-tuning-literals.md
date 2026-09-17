---
name: inline-tuning-literals
description: "Don't hoist tuning numbers into a named-constant block; inline them where used"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: cd8b4020-41c8-496d-b461-8cea9ee44b48
---

When writing algorithm/tuning numbers (particle count, step scale, trail length, widths, opacities), do NOT extract them into a block of named `const`s at the top of the file. Inline the literal at the point of use. He explicitly said "no need for constants, if I need I would ask you to change them specifically."

**Why:** a wall of named tuning constants reads to him as configuration surface / complexity — it looks like an "abstract system" with knobs. He'd rather see a small, direct algorithm. He treats specific numbers as things he'll ask me to change one at a time, not a config API.

**How to apply:** inline literals in the code (e.g. `Math.random() < 0.01`, `count = 1500`). This overrides the usual "no magic numbers" habit and CLAUDE.md §6 (which is about *design tokens for color/typography*, not algorithm tuning). If a value genuinely repeats across many sites, prefer reading it from a shared source (e.g. `array.length`) over a named const. Applies together with [[code-design-taste]] and [[concrete-first-prove-plumbing]].

**One exception (lead, 2026-07-14):** a number that encodes an EXTERNAL library's contract — not our tuning — gets a named const, since the library exports none and comments are banned: `const MAX_COLLISION_PRIORITY = 1000` (deck's documented ±1000 collision-priority bound; he first asked whether deck names it, and only after confirming it doesn't, asked for our own const).
