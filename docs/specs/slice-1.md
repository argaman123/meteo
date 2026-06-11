# Slice 1 — First layers, time & hover (2D core MVP)

**Status:** spec approved by the lead 2026-06-11 (this document is the approved design).
**Goal:** the map page becomes a real product surface: catalog-driven layers rendered by our own
renderers, a global time scrubber, hover readout, and a data-access layer speaking the real
backend contract — all 2D-only (globe returns later per `decisions.md`).

Per our workflow this spec was built question-by-question with the lead; everything below is
**decided**, not proposed. The detailed implementation plan follows separately.

## Objective

1. **First-party renderers** (colormap + CPU particles) on stock deck.gl primitives;
   `weatherlayers-gl` is removed from the project entirely.
2. **Layer registry** with the finalized declarative definition; temperature + wind remain the
   two catalog layers.
3. **Data-access layer** speaking the bbox-windowed, continuous-timeline contract, fed in dev by
   an in-app HTTP interceptor mock serving the fixtures.
4. **Global time controller + scrubber** (jumps only, keyboard included).
5. **Hover readout** + **minimal Units module** (rule 3 satisfied from the first rendered value).
6. **UI chrome v1**: full-height layer bar on the right, floating basemap/AOI controls, bottom
   time bar — utilitarian, pending the dedicated UX pass.
7. **Frame-AOI** as a 2D fly-to (predefined placeholder AOIs).

## Decisions locked during this spec (recorded in `decisions.md`)

- **Continuous timeline:** the client requests a **unix-seconds timestamp**; the backend answers
  with the **nearest frame** that parameter has. The frontend never deals with runs/cycles.
- **Time UX:** per-layer fixed availability windows (all layers: **−24h → +96h, 3h step** for
  now), declared in the layer definition. Multiple active layers merge to the **finest** step.
  Time moves by **discrete jumps only** (drag/click/arrow keys) — no playback for model layers
  (much later, if ever). No polling / live-follow yet. A **Now** button jumps to current time.
- **Time display:** **Local only**, shown in the bottom time bar. Dual Zulu+Local arrives with
  the Geo module (Slice 3). Requests always use unix time.
- **URL view state: dropped** — the URL stays clean; no share/bookmark mechanism on the map page
  (deferred indefinitely; roadmap/vision updated).
- **Missing data:** JSON `null` in the values grid = missing; the parser converts to `NaN`.
  Additionally each layer may declare a **`visibleRange`** — values outside it render as missing
  (layer decides what to show).
- **Equirectangular→mercator hazard:** backend grids are lat/lon-linear; pasting them straight
  onto a mercator map would misplace data at high latitudes (false data). Fix: during the CPU
  colorize pass, output texture rows are spaced **linearly in mercator Y** (pure arithmetic, once
  per grid change).
- **Data flow:** stores orchestrate, the engine renders. Camera state stays inside the engine,
  exposed as readonly signals.
- **Dev mock:** an in-app **HTTP interceptor** in `dev/` answers `/api/*` from fixtures. It is
  registered through an **environment file swapped out by the prod build** (`fileReplacements`),
  so production bundles contain zero mock code. This is a narrow, recorded exception to the
  `dev/` quarantine rule (CLAUDE.md §6 gets the exception note when the code lands).
- **Renderer look:** particles = uniform white streaks with fading trails (speed = motion);
  colormap interpolation is per-layer **`paletteStyle: 'smooth' | 'stepped'`**. Palettes and
  AOIs ship as placeholders; the lead supplies real ones (sanitized) whenever convenient.

## Backend contract (implemented by the dev mock now, the real backend later)

One endpoint for field grids:

```
GET /api/grids?parameter=temperature&model=local&time=<unix-seconds>&bbox=<w>,<s>,<e>,<n>
```

- `time` — unix seconds; the response is the nearest frame that parameter has.
- `bbox` — the visible area **plus a padding margin** (config), so small pans don't refetch.
- `model` — chosen **by the client** from the zoom level: one config threshold decides
  `wide` (zoomed out) vs `local` (zoomed in).
- Response — the existing grid JSON format (`FieldGridDocument`), windowed to the bbox,
  `null` = missing.

## Architecture

Data flows one direction: **stores → data-access → engine**.

- **`TimeStore`** (new signal-store) — `currentTime` (unix, snapped to the merged step), the
  merged window and step of active layers; `jumpTo`, `stepForward`, `stepBack`, `jumpToNow`.
- **`LayersStore`** — which catalog layers are on, per-layer opacity, draw order; `toggle`,
  `setOpacity`, `move`.
- **Engine camera signals** — the engine owns the MapLibre camera and exposes readonly signals:
  `bbox`, `zoom`, plus `cursorPosition` (lat/lon under the pointer) for hover. New engine method:
  `flyToBounds` (frame-AOI).
- **`FieldDataService`** (new, the data-access layer) — reacts to (active layers × time × padded
  bbox × model-by-zoom), fetches over the contract, hands complete definitions (catalog entry +
  grid + opacity/order) to the engine. In-flight responses for stale requests are discarded.
- **Layer registry** — `layers/registry.ts` exports the catalog. The definition gains:
  `paletteStyle` (colormap), `defaultOpacity`, `visibleRange?`, and
  `timeWindow: { backHours, forwardHours, stepHours }`. Adding a model layer remains exactly:
  one file in `layers/model/` + one registry line.
- **Tree change (lead approves at review):** two new top-level folders per the hybrid rule —
  `src/app/stores/` (domain signal-stores: `TimeStore`, `LayersStore`; `settings/` keeps holding
  only settings) and `src/app/data/` (the data-access layer: `FieldDataService`; backend contract
  shapes stay in `types/`).

## First-party renderers (in `engine/renderers/`)

**Colormap** — a pure colorize function maps the windowed grid through the palette (smooth or
stepped per `paletteStyle`) into an RGBA texture rendered by a stock deck.gl **BitmapLayer**.
Missing/out-of-`visibleRange` cells are fully transparent. Output rows are mercator-spaced (see
hazard above). Re-colorizes only when grid/palette/opacity changes; the texture-cap quality knob
still applies.

**Particles** — CPU simulation we own end-to-end: particles spawn uniformly across the visible
bbox, advance each frame by bilinear-sampling the wind grid, age out and respawn; never spawn or
survive in missing-data areas. Trails = each particle's last N positions drawn as deck.gl
**LineLayer** segments with fading alpha (white streaks). The particle-count knob still applies;
pan/zoom respawns into the new view. The plan includes a perf micro-benchmark before this
renderer is considered done (budget: ~5,000 particles × ~8 segments at 60 fps).

`weatherlayers-gl` is then uninstalled and removed from `docs/dev/vendored-dependencies.md`;
CLAUDE.md §3 stack row updated.

## UI chrome v1 (layout chosen from mockups: "A, but full bar on the right")

- **Layer bar** — full-height bar docked on the **right edge**: catalog layers with on/off
  toggle, opacity slider, up/down order buttons; the hover-readout on/off toggle lives here too.
- **Floating top-left (inline-end)**: existing basemap buttons (כהה/בהיר/צבעוני) + the
  **frame-AOI** control (dropdown of predefined AOIs → camera flies to bounds). 2–3 invented
  placeholder AOIs in a config file.
- **Bottom time bar** — floating: **Now** button, tick marks every 3h across −24h→+96h,
  click/drag to jump (snapped), **←/→ keyboard steps**, current **Local** time label.
- All Hebrew-labeled, RTL-aware logical CSS, Tailwind utilities + tokens, like the rest of the
  app. Everything is deliberately utilitarian until the dedicated UX pass.
- **Tree change (lead approves at review):** `pages/home/` gains subfolders `layer-bar/`,
  `time-bar/`, `hover-readout/` (three-file components each, per convention).
- **Dev cleanup:** `dev/spike/` (controls + data loader) is deleted — the real UI replaces it.
  The perf HUD stays.

## Hover readout + minimal Units module

- Tooltip follows the cursor showing **every active layer's value**, sampled (bilinear) from the
  same in-memory windowed grid the renderer draws — client-side, no backend call, rAF-throttled.
  Wind shows speed + direction (`רוח: 12 kt / 240°`); missing values show `—`. Default **on**.
- **`src/app/units/`** (new vision-pillar folder, minimal v1): conversions (kt↔m/s migrates here
  from `utils/units.ts`) + per-parameter formatting with **central precision rules** (temp →
  whole °C, wind → whole kt, direction → whole degrees). Every rendered value goes through it.
  The API is shaped so switchable conventions (°F, m/s…) drop in later without changing call
  sites.
- A small local-time formatter (unix → Local display) lives in `utils/` for now; the Geo module
  absorbs it in Slice 3.

## Dev mock & fixtures

- `tools/generate-fixtures.ts` is extended to emit frames across −24h→+96h every 3h for both
  models (timestamps relative to generation time), including a parameter with missing areas
  (e.g. a wave-like grid that is `null` over land) to exercise the missing-data path.
- The `dev/` interceptor implements the contract: parse query → pick nearest frame → slice the
  grid to the bbox → respond in the real JSON shape (small artificial latency, config).

## Out of scope (later slices)

Globe/3D (returns only after first-party particles are verified trustworthy), contours/barbs,
level selector, legends, layer management panel beyond the bar above, click → detail panel,
URL view state (dropped), polling / live-follow, playback, warnings, search, raster loops,
real palettes/AOIs.

## Inputs needed from the lead (all non-blocking)

1. Old-app **palettes** (sanitized value→color stops), whenever convenient — placeholder until.
2. Real **AOI list**, whenever convenient — placeholders until.
3. Eventually: confirm the real backend's missing-value convention is indeed `null` (parser
   isolates the assumption either way).

## Verification

- Scrub across −24h→+96h — both layers update; keyboard steps work; **Now** jumps correctly.
- Toggle layers, change opacity, reorder — render follows.
- Hover shows all active layers' values, formatted via Units; toggle works; missing shows `—`.
- Zoom across the model threshold — data switches wide↔local; pan past the padding — refetch.
- Colormap alignment spot-check at high latitude vs known grid values (the mercator fix).
- Missing-data layer: transparent holes, no particles, `—` on hover.
- Frame-AOI flies to each placeholder AOI.
- Perf HUD: 60 fps with colormap + animated particles at default knobs; knobs still scale.
- Chrome-for-Testing 113 smoke test clean; RTL/Hebrew spot-check.
- Lint + typecheck clean. Temporary Vitest checks (bbox windowing, bilinear sampling, kt↔m/s,
  time snapping/step-merge, mercator row mapping) pass during development and are **deleted
  before slice close** per the testing policy.

## Tasks (order — detailed plan to follow per workflow)

1. Fixtures + contract: extend the generator; build the dev interceptor + environment swap.
2. Stores + data-access: `TimeStore`, `LayersStore`, engine camera signals, `FieldDataService`.
3. Registry + finalized definition shape; wire temperature + wind through the new path.
4. First-party colormap renderer (incl. mercator row-resample + missing data); remove
   WeatherLayers raster usage.
5. First-party particle renderer (+ micro-benchmark); remove `weatherlayers-gl` entirely.
6. UI chrome: layer bar, time bar, hover readout + Units module, frame-AOI.
7. Cleanup (`dev/spike/`), docs updates (CLAUDE.md §3/§6/§11, decisions/roadmap/vision,
   vendored-dependencies), verification pass.
