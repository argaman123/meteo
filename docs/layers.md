# Layers — `src/app/layers/`

How a weather layer is defined, fetched, gated in time and drawn. Read before adding or changing a
layer. Engine-side looks: [engine.md](engine.md). Time machinery: [time.md](time.md). Wire
details: [backend.md](backend.md).

## The contract — `Layer<D>` (`layers/base/layer.ts`)

A layer is a registry singleton describing one data source; `D` is its data type.

- `name` — Hebrew; shown in the menu, the hover chip and the legend.
- `looks: LookEntry[]` — `{ look, name, checked }`. `checked` is the default AND the session memory
  of the checkbox (mutated in place). Look names use the kind vocabulary: צבעים, קונטורים,
  אנימציה, חיצים, דגלונים, סמלים, ערכים, תמונה.
- `controls: Control[]` — layer-level pickers (sector, model, parameter…).
- `timeWindow: { backHours, forwardHours, stepHours? } | null` — what the timeline spans for this
  layer; `null` = timeless. Every layer declares its own — never inherited from a parent
  (`LoopLayer`, `ModelLayer`).
- `staticLevel` (default `true`) — `false` = follows the level rail.
- `forcedTimes` — a layer whose data exists only at real times publishes them; they become the
  timeline's stops (polygons).
- `fetch(on: Inputs, injector): Signal<D | null | undefined>` — `undefined` = loading (the map
  keeps the last frame, the time chip pulses); `null` = deliberately nothing (looks removed, menu
  row dims, hover skips). Because `null` is reserved, `D` may not be nullable (`Layer<true>`).
- `relevanceOf(data): TimeRange | true` — the data's own validity window; `true` = timeless.
- `hover(data, lon, lat): string | null` — the layer's line in the hover chip, through Units;
  `null` = nothing here (the chip prints '—').

`Inputs` is the ONLY platform state a layer reads: `bbox()` (settled; `null` = don't fetch yet),
`displayTime()`, `exactTime()`, `window()`, `zoom()` (settled), `level()`, `cursor()`.
`injector.get` is for infrastructure only (`HttpClient`). Keep Inputs to the universal few — a
niche need means simplify the requirement first; a new member is the lead's call.

## LayersService (`layers/layers-service.ts`)

- State: `activeLayers: Map<Layer, Signal<data>>`, `activeLooks: Set<LookEntry>`. Actions are
  show/hide verbs (`showLayer`, `hideLook`, `toggleShortcut`); state uses "active".
- `showLayer` creates a per-activation `EnvironmentInjector` (resources live and die with it),
  wraps the data in `keepIfRelevant` (exactTime vs `relevanceOf` → `null`), then for loop layers
  `playLoop` (`atTime(data, loopTime)`), adds one draw effect per activation (a playhead flip
  redraws only loop layers), and shows the looks whose `checked` is true.
- Exclusive look kinds: Colormap, Particles, Icons — one active look per kind, the newest wins.
- Effects: `syncTime` pushes active windows + forced times into TimeService; `syncLoops` pushes
  loop times into PlayerService (and holds while a loop layer is loading with no times yet).
- Startup policy lives in the page: the home page shows only `coordinates`.
- 195 lines and still coherent; propose a split when it next grows (seams: loop glue, shortcuts).

## Registry (`layers/registry.ts`)

- `layers = registerLayers({ key: new Layer(), … })` — keyed singletons, passed around by
  instance. Keys form the settings storage keys: `settings.<key>.<field>` and
  `settings.<key>.<LookKind>.<field>`.
- `menuLayers` — what the menu lists, in order. A `LayerGroup` puts several layers behind one row
  with an exclusive Table toggle (birds: מסונן | גולמי). Layers never know about the menu.
- `shortcuts` — bundles `{ layer, looks: LookKind[] }[]` + a lucide icon. Pressing applies the
  exact look set; pressed = every member layer active. **Shortcuts are the primary UX**; the layer
  rows are the expert drawer. Ask which bundles a new layer joins.

## Controls & settings (`utils/controls.ts`, `utils/settings.ts`)

- A control is a persisted `setting()` signal with metadata attached by `Object.assign` (so the
  field is `label` — `name` is read-only on functions). Types: `options` (Cycle / Select / Table
  presentation), `toggle` (switch), `percent` (opacity popover), `color` (contour swatch, display
  only).
- One component renders every control: `ControlView` (`pages/home/layer-bar/control/`). Look
  controls: unlabeled → inline at the end of the look row; labeled → their own indented row. Layer
  controls render above the look rows while the layer is active.
- A look ctor option that can be fixed or user-chosen: value given = fixed, no control; omitted =
  the user's control (Radar `noise`). Never leave a control that does nothing for a layer.
- A detail/density choice with real uses both ways gets a control with a detailed default (SLP
  פירוט).
- App settings (units, coordinate format) live in `pages/home/settings-panel/settings-controls.ts`
  with their own `registerSettings` — a sibling file kept import-light on purpose (defining them in
  the component file creates a registry import cycle that crashes boot).
- Stale localStorage after a rename: clear it. No migrations or self-heals.

## Data objects

- `Grid<I>` (`objects/grid.ts`) — one scalar field (`Float32Array`), `info` = the wire's
  `wrap_info` verbatim, `bounds`, `valueAt(lon, lat, 'bilinear' | 'nearest')`, static
  `combine(grids, fn)`, `resampled`, `smoothed`, `extrema`. Built by `Grid.fromWrap`: `null` →
  NaN, rows flipped when `ry > 0` (the backend is south-first), lat = `start_y + ry·row`.
- `VectorField = { u: Grid, v: Grid }` — what particles, barbs, arrows and crests read.
- Convert wire → internal on receive (in `parse`/`load`); never let a wire type linger.

## Layer kinds

### ModelLayer (`layers/model/model-layer.ts`) — `D = Grid<ModelWrapInfo>[]`

- One `httpResource` per entry of `parameters` (the `Parameter` enum = wire names).
- Each layer declares its `quantity` and `unit`; the parent's `label` (`format(value, quantity,
  unit)`) feeds the colormap/contour labels and the default `hover` (bilinear value of the first
  grid, `null` off-grid). Wind and waves override `hover` (speed/height · direction).
- Heights (feet; surface = 0): `/model/data_with_flat_heights_with_limit/{model}/{ft}/{param}/{displayTime}/params`
  — the backend interpolates in time, so model layers step hourly. Pressures:
  `/model/data-limited/{model}/MB{mb}|SFC/{param}/{displayTime snapped to 3 h}/params` (exact model
  times only — snap, never interpolate). bbox params `min_lon…max_lat`.
- Model: `modelOf(bbox)` = `ECMWF` (local) when the bbox fits `LOCAL_COVERAGE` (placeholder box),
  else `BIG_ECMWF`. Waves override it with their own control. `modelAtPoint` serves point views.
- Surface asks the `SURFACE_` variant where the backend needs it (TMP, RH).
- `levelOf(level)` maps the rail level to the requested one; `undefined` = no map at this level →
  `null` → the row dims (Geopotential in feet).
- `reduction` (default `null`): a layer opting into native resolution sends it and pads the bbox
  0.25° (backend asks 4/5). Only SLP does.
- Relevance = `forecast_time` (absolute unix ms) ±1.5 h. Window 24 back / 96 forward / 1 h. A
  request error means "nothing there" → `null`.

### LoopLayer<F> (`layers/base/loop-layer.ts`) — `D = Loop<F>[]`, `Loop = { frames, shown }`

- A subclass writes name, timeWindow, `loopMinutes`, looks, controls, hover and ONE method:
  `frameRequests(on, injector)` → `Signal<{ params, load }[] | undefined>`. `params` is the cache
  key (JSON) and what `load` sends; one answer may hold several frames.
- The parent owns the rest: a file-private `FrameLoader` (streams frames as they arrive, keeps
  loaded requests when the window slides, evicts failures), grouping by `loopIdOf(frame)` (default
  one loop), the loading/empty gate (no list = `undefined`; empty list or all loaded and empty =
  `null`), relevance (frames ± `loopMinutes`), `atTime` (nearest frame per loop).
- `loopMinutes` = how far back the loop reaches from the chosen time, and the validity pad.

### Others

- `PolygonsLayer` — see Polygons below.
- `Coordinates` (`layers/general/`) — `Layer<true>`, no looks, timeless; hover formats the cursor
  in the settings panel's DD/DMS format.
- `Measurement` (`layers/general/`) — the measure tool's layer, see
  [point-views.md](point-views.md). Registered but not in `menuLayers`.

## The layers

Palettes and level sets are stand-ins until the lead supplies real ones.

| Key | Kind · wire | Looks (✓ = on by default) | Notes |
|---|---|---|---|
| `temperature` | model · `TMP` / `SURFACE_TMP` | צבעים ✓, קונטורים (every 5°, rose) | `TEMPERATURE_PALETTE` −60…40 °C, also used by the meteogram and sounding tint |
| `wind` | model · `U`, `V` m/s (ask 1) | אנימציה ✓, צבעים (speed, 0.55), קונטורים (10–50 in the display unit, violet), דגלונים | isotach levels are display-unit literals |
| `geopotential` | model · `HGT`, pressures only | קונטורים ✓ (every 20 m, sky) | feet levels → no map (dims); surface asks `SFC` |
| `seaLevelPressure` | model, static level · `SLP` at 0 | קונטורים ✓ (2 mb), מרכזים ✓ (H red / L blue chips) | `reduction = 1`; פירוט מפורט/כללי — כללי = `resampled(70,70).smoothed(16)`; centers always found on the smoothed field, value read raw |
| `relativeHumidity` | model · `RH` / `SURFACE_RH` | צבעים ✓ (near-black → green → white, steep 60–100%), קונטורים ✓ (10%, green) | lead: contours matter |
| `waves` | model, static · `ECMWF_WAVE`: `WAVE_HEIGHT` + `WAVE_DIR` at 0 | צבעים ✓ (blurred coast), אנימציה ✓ (crests), קונטורים (0.5 m, cyan), חיצים | מודל Select (one choice). Direction never interpolated by us: providers build a travel VectorField; hover reads direction `nearest` |
| `satellite` | loop 30 min · seconds wire | תמונה ✓ | below |
| `radar` | `RainRadar` (RadarLayer) loop 30 min, one loop per radar | גשם ✓ | 0.1/1/4/8 mm/h stepped; negatives = flagged noise, hidden unless רעש. RadarLayer owns the hover: max over covering radars, `null` below `minimumValue` |
| `polygons` | own kind | פוליגונים ✓ | below |
| `observations` | loop 60 min, 10-min frames · `getDataByParam` (ms) | ערכים ✓ (Labels) | below |
| `filteredBirds` | loop 30 min, 5-min batches, one loop per radar · `get_bird_specific_process` (ms) | סמלים ✓ (`bird` 16 px) | ft → m on receive, forced meters; drop the wire's sentinel row (negative height) |
| `rawBirdRadar` | `RadarLayer` · `get_time_range_to_bird_radars` (ask 6) | צבעים ✓ (Radar, `noise: false`) | cell = height in m (ASSUMED); shares `BIRD_HEIGHT_PALETTE` |
| `lightning` | loop 30 min, 5-min frames · `surface/get_lightning` (seconds) | סמלים ✓ (`bolt` 14 px, color by age) | below |
| `coordinates` | timeless | — | hover only |
| `measurement` | timeless | קו, מרחקים | measure tool |

**Satellite** — `getConfiguration` (a schedule) → `filterBy?sat_id` (images in the loop window) →
`getImageBy` (raw PNG) per frame; sector bounds from `/satellite-sectors/get-all`.
ערוץ: אוטו (the schedule entry active at the time, else IR10.8) / IR / FLC. גזרה: אוטו (`noaeq`)
or the four real sectors. One satellite at a time: the schedule's, else 8; the other only when
the first has no images. Images are histogram-equalized for display (`utils/image.ts`, the old
app's algorithm); IR frames also keep a 1-byte gray channel for hover (`gray // 2 − 80` °C, the
backend's calibration). Images are equirectangular (LNGLAT image coordinates). Whether real IR
arrives inverted is open. Schedule + bounds logic: `satellite-configuration.ts`.

**Observations** — one parameter at a time (פרמטר: טמפרטורה / רוח / גשם / עננות), one file per
parameter exporting an `ObservationParameter` (`parameter` = wire name, `label`, `colorScale`,
`legend` signal, `valueOf`, `textOf`), scales and legends built once at module load. Each 10-min
frame asks `[t − 60 min, t)` and carries each station's latest value. Clouds show every reported
layer ("6/8 3'"). Hover = nearest station within 0.35°.

**Lightning** — each frame asks the whole משך period (15/30/60 min, a cycle chip) before it;
overlapping asks re-download (accepted). Color = age as a fraction of the period (white → yellow
→ orange → dark red), gradient legend in minutes. Hover = nearest lightning: signed kA · local
time. One item is a `Lightning` (never "strike").

## Polygons (`layers/polygons/`)

- Two-phase fetch: `get_maps_times` over the merged window (DISTRIBUTED only) → `forcedTimes`;
  the nearest map within 3 h of displayTime → the map request at that real time. No map in reach =
  `null` with zero requests.
- Data = `{ map, zoom }` — zoom rides the data (the Measurement `{ points, cursor }` idiom) so the
  chip layout re-runs per settled zoom. `forcedTimes` is the one field a fetch fills on its layer
  (it belongs to the activation; returning it from every fetch was rejected as clutter).
- Relevance = `mapValidity(startTime)` = ±1.5 h (stand-in), shared with the meteogram clouds. It must
  hand over at the midpoint between maps, where the time bar's nearest-stop snap switches —
  otherwise live time shows a blank gap.
- `PolygonMap` (`objects/`) flips `[lat, lon]` → `[lon, lat]` (order ASSUMED) and clips rings to the
  sector square (Turf `bboxClip`).
- Sector control (Table): `SECTOR-DEV` מקומי / `SECTOR-BIG` אזורי, bounds in `SECTORS` (from
  MagenS).
- One file per event kind implementing `EventAppearance<E>` (`name`, `style`, `hoverText`), keyed
  by wire type in `EVENT_APPEARANCES` (CLOUD, HAZE, FOG). `drawnEvents` flattens fog out of clouds
  and drops unknown/obsolete types (TURBULENCE, WIND, SNOW). Nested modifiers are plain functions
  that mutate the style passed down (`applyPrecip` → `applyCb`) — code nesting mirrors data.
- Styles are functions of the event's values (palette from the old app, see
  [domain/polygons.md](domain/polygons.md)). Cloud level by base: < 7 kft low, < 20 kft mid, else
  high (vertical hatch). Chip text = eights ("2-4/8") + base–top in kft primes + precip %;
  fog/haze = the visibility band. Haze is surface when `haze_base` is 0/missing. Rain types sit
  linearly on the severity ramp (`RAIN_TYPES`).
- Areas sorted by cloud base (`displayOrder`); a polygon with several events draws once per event.
- `POLYGONS_LEGEND` (swatches) is also the meteogram clouds legend.

## Levels (`services/level-service.ts`)

- `Level = number | string | null`: number = feet ("heights"), string = mb ("pressures"),
  `null` = surface. The collective word is "levels".
- Stand-in lists: surface + every 1,000 ft to 40,000 ft; surface + 1000/925/850/700/500/400/300/
  250/200 mb. `setKind` converts to the nearest stop by altitude (`feetAtPressure`).
- `activeLevel` is session-only (persistence rejected). ↑/↓ step it while the rail shows; the rail
  shows while any active layer has `staticLevel = false`.
- A layer that can't truthfully show the picked level returns no data (row dims, no note) — never
  a "nearest equivalent".

## Rejected (don't re-offer)

- `Layer.inMenu` flag — layers don't know the menu; the registry lists it.
- Defaulting `timeWindow` / `loopMinutes` in a parent — each layer states its own spec.
- Loop helpers as utils, or two loop parents — one `LoopLayer`, one method to write.
- Injecting TimeService or any domain service into a layer — Inputs only.
- Zoom threshold for local/wide model — zoom is blind to coverage. A manual model picker on
  temperature — auto only.
- Nearest-pressure-surface remap for geopotential in feet — misleading; dim instead.
- Time interpolation for mb maps — snap to 3 h.
- 4 mb isobars by default — too low-res next to the old tool.
- Real NEXRAD bird data — far too crowded; made-up fixture.
- `sameData` equal on the playLoop computed — unmeasurable win. Re-add recipe if a mini-PC shows
  playhead churn: reference-compare frames + shown per layer as the computed's `equal`.
- Radar `Grid.merge` / per-site max clearing — stacked maps; hover reports the max.
- Settings self-heals / migrations for stale localStorage.
- A `kind` tag on layer classes — classes discriminate; plain-data descriptors get enums.
