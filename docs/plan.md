# Plan — the task pool

> **Working agreement (lead, 2026-07-07 — replaces the "next few features" list):** this is the
> full pool of everything the destination app still needs — one list, no stages, no predefined
> steps. Each item carries a **rough, dynamic priority** (high / med / low / someday): Claude
> adjusts ratings as the app evolves (or asks); the lead picks the next task by moment and mood —
> sometimes a small filler, sometimes proving a concept — never inferred for him. Work goes **one
> small task at a time**: questions first, built, verified with the lead, committed on approval.
> A finished item leaves the pool and is recorded in CLAUDE.md §11.

| Task | Area | Priority | Notes |
|---|---|---|---|
| Coordinates readout: own button + own hover style | Chrome | Low | Lead 2026-07-23: maybe retire the Coordinates layer in favor of a dedicated toggle button, with a distinct coordinates style in the hover chip (not a layer-line lookalike); the layer shape is accepted for now |
| Draw-order overrides | Layer system | Low | Looks draw in fixed LookKind ranks since stacking; per-look opacity landed 2026-07-13. Remaining: user-adjustable order/opacity for rare cases (e.g. satellite above a model) — wait for a real need |
| More shortcuts (bundles) | Layer system | Low | Shortcuts are the primary UX (vision.md); add bundles as layers land — each is one registry entry; slp/hgt ride inside bundles (lead lowered 2026-07-23) |
| Radar layer: beyond v1 | Looks | Med | **v1 landed 2026-08-10** (see CLAUDE.md §11): LoopLayer kind, per-radar Wraps of rain, stepped client colormap with rounded edges, RainViewer fixture. Remaining: real palette bands + Z-R calibration from the lead (0.1/1/4/8 mm/h are invented), look-row vocabulary (גשם) confirmation, whether radar coverage circles/range rings should draw |
| Loop pacing ideas | Time | Low | Player controls landed 2026-08-19 (play/pause/step/speed in the time bar, see CLAUDE.md §11). Parked here: lead idea 2026-08-18 — priority list of pace-setting kinds instead of sparsest-sets-pace; per-site time lists if a multi-site layer alone ever paces wrong; persist the speed setting if session-only ever annoys |
| Polygons layer: beyond v1 | Looks | Med | Real event model + hatch patterns + pill chips + leaders/rims/hover landed 2026-07-19/20; nearest-map fetch + relevance hiding landed with multi-cadence v3 (2026-07-30). Remaining: pattern showcase so users can pick styles, maybe replace the hand-rolled spreadLabels relaxation with a d3-force layout (lead 2026-07-22, low importance — no canonical displace-don't-hide label library exists; hide-based collision is the industry default and was rejected). Look-experiments queue (lead-approved tries): boundary labels with super-short text, screen-space patterns (FillStyleExtension retest), time ghosting while scrubbing, per-type chip symbols (Windy-style). Shelved 2026-07-20: linked polygon↔chip hover highlight — looked good but too much boilerplate (design if revived: optional `Look.hover(info): boolean` + Overlay forwards deck's global onHover and rebuilds only that look from cached provider output; fill +45 brighten, chip swaps to brightened sprite) |
| Wind particles: dpr-aware trail width | Looks | Med | Lead 2026-08-18: particles "tiny and practically invisible" on the MacBook's hidpi screen. Cause found: `LINE_WIDTH` 1.75 is in trail-texture px while the texture is sized cssSpan × devicePixelRatio (wind-particles.ts:55) — at dpr 2 the line renders half the css thickness of a dpr-1 screen. Fix: scale LINE_WIDTH (and probably the fade constants' visual tuning) by dpr so thickness is css-stable |
| Boot draw-effect cost | Engine | Low | First deck-layer construction blocks ~450ms (contour tracing + colormap raster + label sprites in one sync run); split/defer if boot feel ever matters (measured 2026-07-14) |
| Units module: switchable conventions | Units/Geo | Low | Deprioritized by lead 2026-07-16. kt↔m/s, °C↔°F, NM/km/ft/kilofeet, hPa/inHg; settings UI; every rendered value flows through (§4.3); conversion hazard — temp Vitest checks |
| Level selector (surface / pressure / kilofeet) | Layer system | High | Lead 2026-08-19: the important structural piece left — and the hidden prerequisite of the more-maps phase (lapse rate lives between levels, wind/temp at altitude need one, hgt hard-codes 1000 hPa). Vertical dimension enters `Layer.request` + ModelLayer machinery; aviation kilofeet |
| Wind barbs/arrows look | Looks | Low | Classic aviation glyphs on a grid (lead lowered 2026-07-22) |
| Station/point observations look | Looks | Med | Icons + numeric values at obs points, METAR-style |
| Click → detail panel shell | Interaction | Low | User picks the view, never all at once; raw-values readout as the first view (lead lowered 2026-07-23) |
| Meteogram | Interaction | Med | Time series of parameters at a clicked point; first proof of the charts+click-selection axis (panel shell, charting approach). Lead 2026-08-19: "maybe" — the rest of the interaction/tables/backend-integration axes can wait, loosely coupled, buildable by others later |
| Draw & measure tools | Interaction | Med | Distance/area; Turf.js |
| AOIs: predefined + user-drawn + frame-AOI | Interaction | Med | Fly-to for clean screenshots; predefined per group via config |
| Zulu/Local dual time display | Units/Geo | Low | Requests stay unix; display-side only. NOT in the time chip (lead 2026-07-27) — placement TBD when picked |
| Settings panel | Chrome | Med | Units, time display, quality knobs surfaced in UI |
| Warnings sidebar | Warnings | Low | Current + near-future per AOI, green/yellow/red status (lead lowered 2026-07-27) |
| Globe/3D return + 2D toggle | Engine | Low | **Blocked upstream (spike 2026-07-23):** maplibre 5.24's native globe works (basemap, camera, zero JS errors), but deck's interleaved MapboxOverlay renders our looks broken on it — BitmapLayer (colormap, particles) invisible, SolidPolygonLayer fills smeared into vertical streaks and displaced, IconLayer chips washed out, PathLayer contours dotted; WebGL error flood. Same on deck 9.3.3, 9.3.7, and 9.4.0-alpha.1, and same when layers are built fresh under globe — not a projection-switch caching issue. Retest on future deck majors; fallback path if it stays dead: feed colormap/particle canvases to maplibre-native raster image sources (they do reproject on globe) and keep deck for vector looks. Old gate (verify first-party particles, center-circle hazard) still applies after the interop unblocks |
| Skew-T sounding | Interaction | Low | Vertical profile chart at a point/time |
| Cross-section | Interaction | Low | Vertical slice along a drawn line |
| Search & locate | Interaction | Low | Needs an offline place index — source TBD with the lead; also owns typed-coordinate parsing (Geo module extension, deferred 2026-07-23) |
| MGRS grid overlay | Units/Geo | Low | Map overlay; also restores the MGRS coordinate format (one CoordinateFormat member + the `mgrs` package — built and removed 2026-07-23, "no need right now") |
| Lines/paths look | Looks | Low | Routes, tracks, fronts |
| Text-labels look | Looks | Low | RTL-aware place/value labels as a data layer |
| More layers on existing looks | Layer system | Low | Waves/humidity colormaps, pressure isobars (contours look) — cheap filler tasks; synthetic waves + pressure data already exist |
| Warning notifications | Warnings | Low | Polling-driven alerts on new/changed warnings |
| Forecaster timeline tables | Tables | Low | Published products from the authoring team, displayed here |
| Tabular forecasts | Tables | Low | Parameter × time for a location/route |
| Decoded observations | Tables | Low | METAR/TAF/synoptic in readable tables |
| Auto text summaries | Tables | Low | |
| Presets & theming | Chrome | Low | Modern default + classic/old-look + per-group presets; localStorage, one per PC |
| Dashboard / wall mode | Chrome | Low | Full-screen always-on control-room view; operators reload daily |
| UX design pass | Chrome | Low | Adaptive UI: simple default, grouped advanced controls; not yet designed |
| Animatable non-loop layers | Time | Low | Lead 2026-08-19: layers don't animate by default but should SUPPORT being animated — opt-in playback for model/polygon layers, imagery-loop machinery generalized (today only LoopLayer kinds get the playLoop wrapper; investigate: a capability the layer declares vs a kind, prefetching a time series per layer, what atTime means for a Grid layer). Absorbs the old 'Full time playback (all layers)' someday-row; pairs with the play-button row |
| Custom briefings + print/PDF export | Tables | Someday | |
| More pages + route cutover map | Platform | Someday | Needs the old app's page list from the lead |
| Comments pass | Platform | Someday | Per CLAUDE.md §2 |
| Dependency audit + vendoring | Platform | Cutover | Closed-network delivery gate; also: re-measure perf on a representative mini-PC when access exists |
