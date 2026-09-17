---
name: colors-always-hex
description: "Never author a color as an RGBA number array — always a hex string through rgba(hex, alpha) from utils/color-scale; derived component math (shape.fill destructuring) is exempt"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 76937d38-d246-4360-b276-7adf1effc192
  modified: 2026-08-25T11:46:03.161Z
---

The lead (2026-08-24): "never ever have colors in numbers array always a hex color." Authored
color literals go through `rgba('#94a3b8', 140)` (utils/color-scale), never `[148, 163, 184, 140]`.
Colors COMPUTED from existing values (destructuring `shape.fill` to tweak alpha) are fine — the
rule targets authored literals a reader can't eyeball.

**Why:** hex is instantly readable/searchable; a bare number array hides the color.

**How to apply:** any new deck `getColor`, palette stop, or style constant = hex via `rgba()`.
Swept 2026-08-24: radar ring, polygons default outline, contours casing. Related:
[[code-design-taste]].
