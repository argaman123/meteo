---
name: settings-live-with-component
description: "App-setting control definitions live beside the settings-panel component (settings-controls.ts), not in utils — the lead values feature-folder ownership over strict downward layering, accepting utils→pages imports"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 76937d38-d246-4360-b276-7adf1effc192
  modified: 2026-08-26T12:46:19.843Z
---

Settings saga (2026-08-26): the lead insisted app-setting controls (unit pickers, coordinate
format) be defined WITH the settings-panel component, iterating through utils/units.ts →
utils/geo.ts → utils/settings.ts → the component file (crashed boot — registry import cycle) →
finally `settings-controls.ts` beside the panel, definitions + registerSettings co-located.
He accepted `utils → pages` imports after hearing the layering flag once.

**Why:** to him "one home with the feature" beats abstract layering; scattered definitions
across utils files read as duplication/scatter even when each sat in its domain module.

**How to apply:** when a feature grows configuration, define it in the feature's folder in an
import-light sibling file (never in a component file that low-level modules must import — the
registry cycle crashes boot with "Class extends value undefined"). Flag layering once, then
follow his call. Related: [[code-design-taste]], [[flag-unconventional-choices]].
