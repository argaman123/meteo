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
| Layer-bar visual separation | Chrome | High | Lead 2026-07-22: right after legends. With controls + look rows the layers all look scrambled — make it obvious which rows belong to which layer |
| Draw-order overrides | Layer system | Low | Looks draw in fixed LookKind ranks since stacking; per-look opacity landed 2026-07-13. Remaining: user-adjustable order/opacity for rare cases (e.g. satellite above a model) — wait for a real need |
| More shortcuts (bundles) | Layer system | Med | Shortcuts are the primary UX (vision.md); add bundles as layers land — each is one registry entry; slp/hgt ride inside bundles |
| Satellite imagery look (image projection) | Looks | Med | Project backend PNG imagery onto the map; fixture backend needs a synthetic imagery source. **Gated (lead 2026-07-08):** needs multi-cadence time sync (stacking landed 2026-07-14) |
| Radar layer | Looks | Med | Same raster machinery as satellite; own palette/cadence; same gate as satellite |
| Imagery loops (playback for imagery layers) | Time | Med | Radar/satellite watched as animated loops; model layers stay jumps-only; same gate as satellite |
| Multi-cadence time sync | Time | High | Layers with mismatched cadences (5-min satellite, 15-min radar, 3-h models) each show their nearest frame for the scrubbed time; prerequisite for imagery layers |
| Polygons layer: beyond v1 | Looks | Med | Real event model + hatch patterns + pill chips + leaders/rims/hover landed 2026-07-19/20. Remaining: pattern showcase so users can pick styles, stale-map linger (multi-cadence sync owns nearest-frame semantics), maybe replace the hand-rolled spreadLabels relaxation with a d3-force layout (lead 2026-07-22, low importance — no canonical displace-don't-hide label library exists; hide-based collision is the industry default and was rejected). Look-experiments queue (lead-approved tries): boundary labels with super-short text, screen-space patterns (FillStyleExtension retest), time ghosting while scrubbing, per-type chip symbols (Windy-style). Shelved 2026-07-20: linked polygon↔chip hover highlight — looked good but too much boilerplate (design if revived: optional `Look.hover(info): boolean` + Overlay forwards deck's global onHover and rebuilds only that look from cached provider output; fill +45 brighten, chip swaps to brightened sprite) |
| Borders & labels above weather | Engine | Med | Colormaps paint over basemap borders/labels. First attempt (2026-07-14) slotted deck layers via beforeId 'boundaries_country' — wedged map loading + looked bad, reverted; next candidate: a dedicated borders overlay (own LookKind rank above all) |
| Boot draw-effect cost | Engine | Low | First deck-layer construction blocks ~450ms (contour tracing + colormap raster + label sprites in one sync run); split/defer if boot feel ever matters (measured 2026-07-14) |
| Units module: switchable conventions | Units/Geo | Low | Deprioritized by lead 2026-07-16. kt↔m/s, °C↔°F, NM/km/ft/kilofeet, hPa/inHg; settings UI; every rendered value flows through (§4.3); conversion hazard — temp Vitest checks |
| Geo module: Lat/Lon + DMS + MGRS | Units/Geo | Med | Coordinate formatting/input in one place (§4.4); cursor coordinate readout |
| Level selector (surface / pressure / kilofeet) | Layer system | Med | Vertical dimension enters `Layer.request`; aviation kilofeet |
| Model auto-switch by zoom | Layer system | Med | Regional model on zoom-in; model identity stays an internal layer parameter |
| Wind barbs/arrows look | Looks | Low | Classic aviation glyphs on a grid (lead lowered 2026-07-22) |
| Station/point observations look | Looks | Med | Icons + numeric values at obs points, METAR-style |
| Click → detail panel shell | Interaction | Med | User picks the view, never all at once; raw-values readout as the first view |
| Meteogram | Interaction | Med | Time series of parameters at a clicked point |
| Draw & measure tools | Interaction | Med | Distance/area; Turf.js |
| AOIs: predefined + user-drawn + frame-AOI | Interaction | Med | Fly-to for clean screenshots; predefined per group via config |
| Zulu/Local dual time display | Units/Geo | Med | Requests stay unix; display-side only |
| Live-follow + polling for latest data | Time | Med | New cycles appear without reload; groundwork for warnings polling |
| Settings panel | Chrome | Med | Units, time display, quality knobs surfaced in UI |
| Warnings sidebar | Warnings | Med | Current + near-future per AOI, green/yellow/red status |
| Globe/3D return + 2D toggle | Engine | Med | Gated on verifying first-party particles trustworthy (the center-circle hazard died with the vendor renderer — verify, then re-enable) |
| Skew-T sounding | Interaction | Low | Vertical profile chart at a point/time |
| Cross-section | Interaction | Low | Vertical slice along a drawn line |
| Search & locate | Interaction | Low | Needs an offline place index — source TBD with the lead |
| MGRS grid overlay | Units/Geo | Low | Map overlay, after the Geo module |
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
| Full time playback (all layers) | Time | Someday | Imagery loops generalized to model layers |
| Custom briefings + print/PDF export | Tables | Someday | |
| More pages + route cutover map | Platform | Someday | Needs the old app's page list from the lead |
| Comments pass | Platform | Someday | Per CLAUDE.md §2 |
| Dependency audit + vendoring | Platform | Cutover | Closed-network delivery gate; also: re-measure perf on a representative mini-PC when access exists |
