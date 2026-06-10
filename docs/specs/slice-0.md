# Slice 0 — Foundation & Engine Spike

**Status:** not started. **Goal:** stand up the project skeleton and validate the rendering engine
as far as our environment allows. Per our workflow, we **plan → approve → build**: at the start of
this slice we confirm the inputs below, agree the detailed plan, then code.

## Objective

1. A clean, scaffolded Angular 22 app following `CLAUDE.md`.
2. A first, thin **Map Engine Adapter** that shows a self-hosted basemap on a globe with a 2D toggle.
3. A **go/no-go spike**: animated particles + a colormap from lead-provided fixture data, judged by
   best-effort measurement + reasoned assessment (no target-hardware access), including a
   **Chrome-for-Testing 113** smoke test for the browser floor.

## In scope

- Scaffold: Angular 22 (standalone, **zoneless**, signals, **Vitest**), **Tailwind**, **Angular CDK**;
  **`browserslist` pinned to the Chrome 112 floor**. (Dev machines need Node ^22/^24/^26 + TS 6.)
- Project structure per `CLAUDE.md` §5; ESLint + Prettier + strict TypeScript.
- **Design tokens** + one default (modern/clean) theme; **UI font decided here** (leading candidate
  **Heebo**); confirm **RTL** plumbing (logical properties, `dir`).
- App **shell + routing skeleton** (cutover-ready route map, from the old app's route list).
- **Map Engine Adapter** (`src/app/map/engine/`): the only module importing MapLibre/deck.gl/
  WeatherLayers. Minimal interface: init, set basemap/style, set view (globe/2D), add/remove layer.
- Basemap: **Protomaps PMTiles** + open styles (dark/light/+), self-hosted; **RTL text plugin
  vendored**; **Hebrew glyph ranges verified**.
- **Layer-definition v1** — the minimal declarative shape the spike's two layers need (finalized
  with the registry in Slice 1).
- **Perf HUD** (dev-toggleable FPS/memory) + **adaptive quality knobs** (particle count, texture caps).
- **The spike:** one colormap layer + one animated particle layer from **fixture data in the exact
  real backend formats** (JSON grids), converted client-side to textures, rendered via
  deck.gl/WeatherLayers on the MapLibre globe, with the 2D toggle.
- **Vendored-dependency workflow**: document the offline add-a-package procedure as we hit it,
  covering ongoing development *inside* the network later (no registry there).

## Out of scope (later slices)

Layer registry breadth, time controller, hover/click/detail, units/geo modules, warnings, charts,
reporting, presets/dashboard. (Only the *minimum* of each needed to make the spike run.)

## Spike success criteria (the go/no-go)

- **60 fps** with the colormap + 1 particle layer @ 1080p on available dev hardware, and the
  quality knobs demonstrably scale down (particle count / texture caps).
- Memory stable (no leak/creep) over several minutes of animation + time changes.
- 2D ↔ globe toggle works and the data layers render correctly in **both** views.
- The built app runs cleanly on **Chrome-for-Testing 113** (closest proxy for the fleet's Chrome 112).
- Go/no-go recorded as a **reasoned assessment** against the perf budget — target hardware is not
  directly testable. **If it fails:** fall back to evaluating CesiumJS for the engine before
  proceeding (see `docs/decisions.md`).

## Inputs needed from the lead (at slice start)

1. ~~Fixture data files~~ **Amended 2026-06-10:** the lead instead specified the formats and approved
   generating fixtures in-repo (see `docs/plans/2026-06-10-slice-0-foundation-and-spike.md`); a
   public-domain satellite PNG fetched once stands in for the satellite example.
2. ~~Old-app route list~~ **Amended 2026-06-10:** deferred — Slice 0 ships the front page only.
3. **Photos/descriptions** of the old app's globe view for behavioral reference, as needed.

## Tasks (order)

1. Confirm the inputs above; agree the detailed plan (approval gate).
2. Scaffold the app + tooling (incl. browserslist floor); commit.
3. Project structure, tokens, font decision, RTL plumbing; a trivial shell + route.
4. Engine adapter + Protomaps basemap on a globe + 2D toggle (+ RTL plugin, Hebrew glyphs).
5. The spike (colormap + particles from fixtures) + perf HUD + quality knobs; measure best-effort;
   run the Chrome-for-Testing 113 smoke test.
6. Record the result + decision in `docs/decisions.md`; update `CLAUDE.md` status.

## Verification

- App builds, lints, typechecks clean; `npm`/`ng` scripts documented.
- Globe + basemap render; 2D toggle works; Hebrew label renders correctly (RTL spot-check).
- Spike meets the success criteria above (capture FPS/memory numbers + the CfT 113 result).
