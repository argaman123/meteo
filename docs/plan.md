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
| Multi-layer stacking | Layer system | High | Retire exclusive selection; hover readout shows all active layers' values |
| Per-layer opacity + draw order | Layer system | High | Natural follow-on to stacking, in the layer card |
| Contours/isolines look, labeled | Looks | High | Isobars first — synthetic pressure data already in the fixture backend |
| Satellite imagery look (image projection) | Looks | High | Project backend PNG imagery onto the map; fixture backend needs a synthetic imagery source |
| Radar layer | Looks | High | Same raster machinery as satellite; own palette/cadence |
| Imagery loops (playback for imagery layers) | Time | High | Radar/satellite watched as animated loops; model layers stay jumps-only |
| Polygons look | Looks | High | Warning/advisory/analysis areas, forecaster-authored, display-only; Turf.js adoption point |
| Units module: switchable conventions | Units/Geo | High | kt↔m/s, °C↔°F, NM/km/ft/kilofeet, hPa/inHg; settings UI; every rendered value flows through (§4.3); conversion hazard — temp Vitest checks |
| Geo module: Lat/Lon + DMS + MGRS | Units/Geo | Med | Coordinate formatting/input in one place (§4.4); cursor coordinate readout |
| Level selector (surface / pressure / kilofeet) | Layer system | Med | Vertical dimension enters `Layer.request`; aviation kilofeet |
| Legends (color scale of active layers) | Layer system | Med | |
| Model auto-switch by zoom | Layer system | Med | Regional model on zoom-in; model identity stays an internal layer parameter |
| Wind barbs/arrows look | Looks | Med | Classic aviation glyphs on a grid |
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
| More layers on existing looks | Layer system | Low | Waves/humidity/pressure colormaps — cheap filler tasks; synthetic waves data already exists |
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
