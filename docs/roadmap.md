# Roadmap (Slices)

The platform is built in **shippable slices**, each with its own spec → plan → build cycle. Routes
cut over from the old site as slices complete. **Don't build later-slice features speculatively.**

## Slice 0 — Foundation & spike ⭐ (current)

Scaffold + prove the engine before building deep. Spec: [`specs/slice-0.md`](specs/slice-0.md).

- Scaffold Angular 22 (standalone, zoneless, signals, Vitest) + Tailwind + Angular CDK.
- Project structure (per `CLAUDE.md` §5), design tokens + one default theme.
- Vendored-dependency workflow documented.
- App shell + routing skeleton (cutover-ready).
- **Map Engine Adapter** interface + thin MapLibre init: self-hosted basemap (dark/light/colorful)
  on a globe with a 2D toggle.
- **iGPU spike:** animated particles + a colormap from encoded tiles via deck.gl/WeatherLayers on
  the MapLibre globe, measured on a **baseline integrated GPU**. **Go/no-go on the engine.**

## Slice 1 — Globe + first layers + time + hover (core MVP)

- Layer registry + 1–2 encoded-tile layers (a colormap + wind particles).
- Global time controller + scrubber (live/forecast/history); layer on/off/opacity/order.
- **Hover readout** (all active layers' values).
- Basemap presets; **"frame AOI" button** (animate globe → 2D → zoom to AOI).

## Slice 2 — Full layer system + panel + levels

- More layer types: contours, stations (icons+values), polygons (incl. warning polygons), RTL text
  labels, raster/satellite/radar loops.
- Layer management panel; **level selector** (surface / pressure / kilofeet); legends.

## Slice 3 — Interaction & domain depth

- Click **detail panel**: meteogram, Skew-T sounding, cross-section, raw values (user chooses).
- **Map tools**: draw/measure, define cross-section line, search & locate.
- **Coordinate & grid** (Geo): lat/lon, DMS, MGRS + grid overlay; Zulu/Local time.
- **Units module** surfaced across hover/tables/charts.
- **Warnings**: sidebar + active notifications (polygons already a layer from Slice 2).

## Slice 4 — Presets/theming + dashboard mode

- Preset system (modern default + classic/old-look + per-group), localStorage one-per-PC.
- Control-room / wall **dashboard mode**.

## Later — feature pages (route-by-route cutover)

- Reporting & tables subsystem: tabular forecasts, decoded observations, auto text summaries.
- Export/print (PDF, data export).
- The remaining pages, each migrated independently.

> Units & coordinate display are cross-cutting; their basics may be pulled earlier as needed.

## Verification (per slice)

- Run locally; globe + basemap presets render on a baseline-iGPU profile.
- Slice 0 spike: measure particle + colormap FPS/memory on 8 GB iGPU @ 1080p vs the perf budget.
- Slice 1: scrub time across live/forecast/history; toggle layers/opacity/order; hover shows all
  active layers; match-or-beat current Cesium responsiveness; RTL spot-check (Hebrew).
- Lint + typecheck clean; manual smoke of key flows.
