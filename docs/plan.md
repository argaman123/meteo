# Plan — the task pool

Everything the destination app still needs, one list. Priorities are rough and dynamic: adjust
them as the app evolves, or ask. The lead picks the next task — never infer it. One small task at
a time: questions, build, verify with the lead, commit on his word. A finished item leaves the
pool; its current state goes into the area doc. Waiting on the backend or real data is never a
task: it is one line in [backend-asks.md](backend-asks.md), which the lead hands over. Never
offer a backend layer of an existing look as a row; the lead brings special-looking layers from
the old site.

| Task | Area | Priority | What's left |
|---|---|---|---|
| Flight route | Interaction | High | Click a route on the map → the weather along it (clouds met, wind strength…). Study the old app's feature and MagenS (`flight_limit`, `points_data_between_heights_and_times_in_feet`, `data_by_route_edge`) first; the Python route becomes a backend ask |
| Cross-section | Interaction | High | Right-click menu item → a graph rising like the meteogram: one colored line per active parameter at the level-rail level, along the time line |
| Skew-T (parked) | Interaction | High | Branch `skew-t` (91292d5); the lead checks it at the old site on his next visit: CIN, virtual-temperature CAPE, mixing-ratio labels, Hebrew name, 150 mb top. Resume: rebase on main, drop its `utils/wind-barbs.ts` (now in `utils/wind.ts`), expect conflicts in point-menu/home-page/units/thermodynamics |
| Warnings | Warnings | High | Sidebar of current + coming warnings with green/yellow/red, alerts on new/changed ones, warning polygons as a map layer. Backend: `/warnings` and `/new-warnings` — study which one viewers read in the old app first |
| Flight areas | Interaction | High | Predefined drawings from `/places/flight-areas/get` (e.g. an airport's airstrip); pick any number to show on top of all layers |
| Search & locate | Interaction | High | A search box: place names from a list we download and keep in the repo (e.g. GeoNames, offline), or typed coordinates in any format (DD, DMS, UTM, גריד מבצעי) → a marker on the map there |
| Base status | Warnings | High | A list of the selected bases, each colored by its current status (`/base-status`); hovering a base shows all its latest data and the report time |
| Polygon authoring | Interaction | High | Huge: meteorologists draw and edit polygon maps on the meteorologist site. Study the old app's editor and the backend's save/publish routes first |
| Forecaster timeline | Tables | Med | A must, and a large separate UI: the published `/timeline` forecasts per area over time (clouds, fog, rain, CB with chances). Needs thorough study of the old app before any build |
| Meteorologist site | Platform | Med | A second UI beside the client site: its own pages and look on the same layers, services and engine; TS changes kept minimal (new pages, no forks of shared code) |
| Real radiosondes | Interaction | Med | Launch stations on the map (`/places/get-sonde-stations`); clicking one shows its real measured sounding (`/sonde/get-nearest-sonde`) as a table and a Skew-T-like graph — shares the parked Skew-T |
| גריד מבצעי overlay | Units/Geo | Low | The formats exist; left: the גריד מבצעי grid lines on the map, and reading UTM / גריד מבצעי as Search & locate input |
| Animatable non-loop layers | Time | Low | Play button for model and polygon layers: step through forecast hours (prefetch the next maps) |
| Polygons: styles session | Looks | Low | A quick session: we propose fill, pattern, outline and chip styles we think fit (a droplets pattern for rain among them), the lead picks |
| Boot draw cost | Engine | Low | First draw blocks ~450 ms. Measure what costs what first, then pick: one layer per frame (simple) or contour tracing in a Web Worker (no freeze, but async — a result that lands after a time/level change must be dropped) |
| Comments pass | Platform | Someday | Code comments are banned until then |
