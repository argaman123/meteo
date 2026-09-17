---
name: verb-noun-method-names
description: "Lead rejects generic method names (activate/deactivate); wants specific verb+noun pairs like showLayer/hideLook, applied consistently across siblings"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 3d3fb905-26ad-4354-9858-7491977c7da0
---

Lead feedback (2026-07-08, LayersService): `activate(look)`/`deactivate(look)` were "too general" — renamed to `showLook`/`hideLook`, with siblings following the same verb+noun pattern (`showLayer`, `hideLayer`, `toggleLayer`).

Refined by his own edits (2026-07-13): **actions use show/hide verbs; state uses the "active" adjective** — signals `activeLayers`/`activeLooks`, predicates `isLayerActive`/`isLookActive`, registry `defaultActiveLayers`. My participle naming (`shownLayers`, `isLayerShown`) was replaced wholesale. Also: when a component holds both registry data and the domain service, the data keeps the plain noun (`layers`) and the service gets the suffix (`layerService`).

**Why:** generic verbs hide what the method operates on; a junior scanning call sites should read the object of the action in the name. Related: [[code-design-taste]].

**How to apply:** when a service manages more than one noun (layers and looks), every public/private method names its noun explicitly — never a bare `show()`/`toggle()`/`activate()`. Extend the chosen verb pair to all siblings so two styles never coexist.

2026-08-18: also no graphics/GIS jargon in names — he rejected `rasterize` ("not liking the
wording at all") AND rejected my `imageOf` replacement ("not sure i like the of"): the -Of/-At
accessor pattern (`valueAt`, `loopTimesOf`) is for cheap reads on data, not for functions that do
real work — those get plain verb+noun, his pick: `buildImage`. Prefer plain words a junior knows
over domain verbs, even when the jargon is technically precise.

2026-08-18, more of the same session: טווח/`range` → עיגול/`circle` (his pick from offered
options — for UI labels he prefers the plainest visible-thing word over the domain term);
`hasValue` → `filterValue` ("hasvalue is weird"); ctor param `overrides` → `options` to match the
sibling class. Pattern: when two sibling classes take the same kind of parameter, use the same
parameter name.

2026-08-19: "offer names when i ask names" — when he asks to rename something, ALWAYS present
candidate names via a structured question (with a recommendation), never pick and apply. He
rejected two of my picked names in a row (playheadTime, sparsestStepMs) after I applied them.
