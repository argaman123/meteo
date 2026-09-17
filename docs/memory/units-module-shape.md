---
name: units-module-shape
description: "Units API is quantity-based with explicit source unit (lead, 2026-07-08): convert/format(value, Quantity, from) — module resolves the display unit (settings later, windy-style); no hidden canonical-unit convention"
metadata: 
  node_type: memory
  type: project
  originSessionId: 849d7b34-80ed-4ce0-9070-818782d75312
---

The lead set the Units module's public shape (2026-07-08, windy's settings screen as the reference), refined same day: **both** functions take the quantity plus the explicit unit the value is in — `convert(value, Quantity.WindSpeed, Unit.MetersPerSecond)` and `format(value, Quantity.Temperature, Unit.Celsius)`. The module maps each Quantity to its display unit (`displayUnit` record — hard-coded °C/kt/met° now, a per-quantity user setting later, like windy's Wind: kt/bft/m/s/km/h/mph rows); convert returns the number in that display unit, format renders it with the suffix. His words: "convert should also receive the quantity, and a from unit, that always converts from 'from'". No hidden canonical-unit convention — every call states its source unit.

**Why:** display choices never hard-wire into call sites; the future "Units module: switchable conventions" task (plan.md, High) becomes a pure units-module change (settings feed `displayUnit`). Conversion math stays a hand-rolled factor table — generic libs (convert-units, js-quantities) don't cover Beaufort (nonlinear)/dBZ/kilofeet/met-degrees and the settings mapping is ours anyway.

**How to apply:** new hover/readout/legend code passes value + Quantity + source Unit; never format a unit string in a layer. Known wrinkle to raise when the conventions task lands: contour level sets are display-unit literals (isotachs in kt), so switchable conventions affect level choices too. Related: [[layer-look-pipeline]], [[code-design-taste]].
