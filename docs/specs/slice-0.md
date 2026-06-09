# Slice 0 — Foundation & Engine Spike

**Status:** not started. **Goal:** stand up the project skeleton and **prove the rendering engine on
real hardware before building anything deep.** Per our workflow, we **plan → approve → build**: at
the start of this slice we resolve the open questions below, agree the detailed plan, then code.

## Objective

1. A clean, scaffolded Angular 22 app following `CLAUDE.md`.
2. A first, thin **Map Engine Adapter** that shows a self-hosted basemap on a globe with a 2D toggle.
3. A **go/no-go spike**: animated particles + a colormap from encoded data tiles, on a baseline
   integrated GPU, meeting the performance budget.

## In scope

- Scaffold: Angular 22 (standalone, **zoneless**, signals, **Vitest**), **Tailwind**, **Angular CDK**.
- Project structure per `CLAUDE.md` §5; ESLint + Prettier + strict TypeScript.
- **Design tokens** + one default (modern/clean) theme; self-hosted **Hebrew+Latin font**; confirm
  **RTL** plumbing (logical properties, `dir`).
- App **shell + routing skeleton** (cutover-ready route map).
- **Map Engine Adapter** (`src/app/map/engine/`): the only module importing MapLibre/deck.gl/
  WeatherLayers. Minimal interface: init, set basemap/style, set view (globe/2D), add/remove layer.
- Self-hosted **basemap** with dark / light / colorful styles (or the closest we can stand up
  offline for the spike).
- **The spike:** one colormap layer + one animated particle layer from **encoded data tiles**,
  rendered via deck.gl/WeatherLayers on the MapLibre globe, with the 2D toggle.
- **Vendored-dependency workflow**: document the offline add-a-package procedure as we hit it.

## Out of scope (later slices)

Layer registry breadth, time controller, hover/click/detail, units/geo modules, warnings, charts,
reporting, presets/dashboard. (Only the *minimum* of each needed to make the spike run.)

## Spike success criteria (the go/no-go)

- **60 fps** with the colormap + 1 particle layer on a **baseline integrated GPU @ 1080p**.
- Memory stable (no leak/creep) over several minutes of animation + time changes.
- 2D ↔ globe toggle works and the data layers render correctly in **both** views.
- Subjectively **matches or beats** the current Cesium app's responsiveness.
- **If it fails:** fall back to evaluating CesiumJS for the engine before proceeding (see
  `docs/decisions.md`).

## Open questions to resolve at the start (from `docs/decisions.md`)

1. **Current custom renderer:** WebGL or 2D canvas? reprojected to the globe or a flat overlay?
   draws colormaps, particles, or both? → how much we port vs. use ready-made.
2. **Local basemap format:** vector tiles (cheap dark/light/colorful style swaps) vs raster
   (separate styled sets) — what can we self-host for the spike?
3. **Encoded-tile sample:** can we get one real (or representative) encoded data tile + its decoding
   scheme to drive the spike? If not, we mock one to the expected format.

## Tasks (order)

1. Resolve the three open questions; agree the detailed plan (approval gate).
2. Scaffold the app + tooling; commit.
3. Project structure, tokens, font, RTL plumbing; a trivial shell + route.
4. Engine adapter + basemap on a globe + 2D toggle.
5. The spike (colormap + particles from encoded tiles); measure against the budget.
6. Record the result + decision in `docs/decisions.md`; update `CLAUDE.md` status.

## Verification

- App builds, lints, typechecks clean; `npm`/`ng` scripts documented.
- Globe + basemap render; 2D toggle works.
- Spike meets the success criteria on a baseline-iGPU profile (capture FPS/memory numbers).
- RTL spot-check with a Hebrew label.
