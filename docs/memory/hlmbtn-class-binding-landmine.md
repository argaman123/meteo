---
name: hlmbtn-class-binding-landmine
description: "Never put a dynamic [class]=\"expr\" STRING binding on an hlmBtn element — it fights the variant classes (bg-primary silently lost); per-key [class.x] bindings are safe, and semantic states become new variants in our helm button copy"
metadata: 
  node_type: memory
  type: project
  originSessionId: 76937d38-d246-4360-b276-7adf1effc192
  modified: 2026-08-24T09:34:53.559Z
---

A dynamic `[class]="condition ? 'a' : 'b'"` string binding on a `hlmBtn` element corrupts the
button's styling: spartan's `classes()` merge dropped the variant's `bg-primary` while the stale
template class stuck (seen 2026-08-24 on the layer-bar rows). Boolean per-key bindings
(`[class.font-semibold]="..."`) compose fine.

**Why:** hlmBtn manages its class list through spartan's `classes()`/tailwind-merge host binding;
a template classMap string competes with it per-render and background utilities collide.

**How to apply:** for a conditional semantic style on a button, either use per-key `[class.x]`
bindings or add a variant to our helm copy (they're our code) — e.g. the `soft` variant
(`bg-secondary/50`, hover restores full secondary) added for quiet-but-button-like rows.
Related: [[adopt-library-look]].
