# Plan — the task pool

Everything the destination app still needs, one list. Priorities are rough and dynamic: adjust
them as the app evolves, or ask. The lead picks the next task — never infer it. One small task at
a time: questions, build, verify with the lead, commit on his word. A finished item leaves the
pool; its current state goes into the area doc.

| Task | Area | Priority | What's left |
|---|---|---|---|
| Real backend: open items | Platform | High | Send backend-asks.md; lead supplies the local ECMWF coverage box, a real polygons file (coordinate order), Hebrew precip names; confirm the "Open" list in backend.md on live data |
| Meteogram: beyond v1 | Interaction | High | Wait for ask 2; confirm marked isotachs (25/45 kt); more tabs as parameters land |
| More layers (distinct looks) | Layer system | Med | Waits until the lead is near the old site to see which layers use special settings |
| Radar: beyond v1 | Looks | Med | Real bands + Z-R calibration from the lead; confirm the גשם row name and the coverage rings |
| Level selector: beyond v2 | Layer system | Med | Real level lists (feet and mb); confirm `height` in feet with the backend lead |
| Shortcuts | Layer system | Low | Add bundles as layers land (one registry entry each) |
| Draw-order overrides | Layer system | Low | User-adjustable order/opacity for rare cases (satellite above a model) — wait for a need |
| Loop pacing | Time | Low | Ideas: a priority list of pace-setting kinds; per-site time lists; persist speed if session-only annoys |
| Animatable non-loop layers | Time | Low | Opt-in playback for model/polygon layers ("not needed for now"); investigate capability vs kind, prefetching a series, `atTime` for grids |
| Polygons: beyond v1 | Looks | Low | Pattern showcase so users pick styles; maybe d3-force label layout; try: short boundary labels, screen-space patterns, time ghosting, per-type chip symbols |
| Observations at real scale | Looks | Low | Draw-everything model holds (5,000 stations at 120 fps measured); the reverted `sameData` equal (layers.md) if a mini-PC dips |
| Sounding table: beyond v1 | Interaction | Low | Wait for ask 3; confirm the תיקון sign; whether RH comes from the backend |
| Skew-T (parked) | Interaction | Low | Branch `skew-t` (91292d5) waits for a professional: CIN, virtual-temperature CAPE, mixing-ratio labels, Hebrew name, 150 mb top. Resume: rebase on main, drop its `utils/wind-barbs.ts` (now in `utils/wind.ts`), expect conflicts in point-menu/home-page/units/thermodynamics |
| Settings panel: more | Chrome | Low | More quantities as the lead asks (one `options()` each) |
| Units: switchable conventions | Units/Geo | Low | °F, NM, inHg…; contour level sets are display-unit literals and must follow |
| Boot draw cost | Engine | Low | First draw blocks ~450 ms (contours + raster + sprites); split if boot feel matters |
| Blue-bar boot bug watch | Platform | Low | Rare: `syncTime` never runs its first time → a permanent 24/96 band. If seen on Angular ≥ 22.1.3: push `windows` imperatively from showLayer/hideLayer, keep an effect only for forced times |
| Globe/3D return + 2D toggle | Engine | Low | Retest on new deck majors; fallback: maplibre raster sources for colormap/particles, deck for vectors |
| Warnings sidebar | Warnings | Low | Current + near-future per AOI, green/yellow/red |
| Warning notifications | Warnings | Low | Polling alerts on new/changed warnings |
| AOIs | Interaction | Low | Predefined per group + user-drawn + frame-AOI fly-to |
| Cross-section | Interaction | Low | Vertical slice along a drawn line |
| Search & locate | Interaction | Low | Needs an offline place index (source TBD); owns typed-coordinate parsing |
| MGRS | Units/Geo | Low | Grid overlay + the MGRS format (one `CoordinateFormat` member + the `mgrs` package) |
| Lines/paths look | Looks | Low | Routes, tracks, fronts (the `Path` look is a start) |
| Forecaster timeline tables | Tables | Low | Published products from the authoring team |
| Tabular forecasts | Tables | Low | Parameter × time for a location/route |
| Decoded observations | Tables | Low | METAR/TAF/synoptic tables |
| Auto text summaries | Tables | Low | |
| Presets & theming | Chrome | Low | Modern default + classic look + per-group presets; one per PC |
| Dashboard / wall mode | Chrome | Low | Full-screen always-on control-room view |
| UX design pass | Chrome | Low | Simple default, grouped advanced controls |
| Briefings + print/PDF | Tables | Someday | |
| More pages + route cutover | Platform | Someday | Needs the old app's page list |
| Comments pass | Platform | Someday | Code comments are banned until then |
| Dependency audit + vendoring | Platform | Cutover | Closed-network gate (dev/vendored-dependencies.md); re-measure perf on a real mini-PC |
