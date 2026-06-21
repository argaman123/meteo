# Slice 1 code walkthrough — review log

Going through all Slice 1 code with the lead, **one subject at a time, foundations → specific**.
For each subject: I give a deep walkthrough surfacing every design decision; the lead reads the
files and gives notes. **Notes are captured here and applied later** (in a batch per subject, or
when he says — not silently mid-review). Context is cleared between subjects, so **this doc is the
resumable index** — a fresh session reads it to know the order, the current position, and the
outstanding notes.

## Order (each only depends on subjects above it)

1. **Grid data model** — `types/wrap.ts`, `objects/grid.ts`
2. **Pure helpers** — `units/units.ts`, `utils/bbox.ts`, `utils/time.ts`
3. **Layer catalog** — `layers/layer-definition.ts`, `layers/registry.ts`, `layers/model/*`
4. **State** — `stores/layers-store.ts`, `stores/time-store.ts`, `settings/particle-settings.ts`, `settings/quality-settings.ts`
5. **Colormap renderer** — `engine/renderers/colormap-renderer.ts`
6. **Particle engine** — `particle-system.ts`, `grid-particles.ts`, `free-particles.ts`, `trail-appearance.ts`, `arc-appearance.ts`, `particle-renderer.ts`
7. **Engine adapter** — `engine/map-engine.ts`, `engine/style-loader.ts`
8. **Data pipeline** — `data/field-data.ts`
9. **UI & frame** — `pages/home/*`, `app.ts/.html/.css`, `app.config.ts`, `app.routes.ts`, `main.ts`
10. **Dev & env** — `dev/perf-hud/*`, `dev/fixture-backend/*`, `environments/*`

## Format (lead's preference)

For each subject: **list the file names with a one-line purpose each.** Nothing more — no
chunk-by-chunk narration, no "tricky bit" flags, no defending decisions. He reads the code himself
and asks if he hits difficulty. Then he gives notes → log them below → apply later.

## Status

- **Subject 1 — Grid data model: COMPLETE** (applied + reviewed — see notes log).
  Final shape: `types/wrap.ts` (`Wrap` + `Bounds`), `objects/grid.ts` (`Grid` class).
  `mercator.ts` moved to `engine/renderers/` (projection is a rendering concern; reviewed with Subjects 5/6).
- **Subject 2 — Pure helpers: COMPLETE.** `units/` dissolved (see notes); `utils/bbox.ts`, `utils/time.ts` reviewed, no changes.
- **Next: Subject 3 — Layer catalog** (not started): `layers/layer-definition.ts`, `layers/registry.ts`, `layers/model/*`.

## Notes log

Format per note: `file:line` — note → decision → status (pending / applied).

### Subject 1 — Grid data model

**Note 1 — type redundancy.** `types/wrap.ts` — three overlapping shapes
(`FieldGridDocument` ⊃ `FieldGrid` ⊃ `VectorField`); metadata cherry-picked into `FieldGrid`
(some doc fields kept, some dropped), and `parameter` carried but never read in product code
(renderers/samplers use `layer.entry.parameter`).
→ **Decision:** collapse to **two types**.
  - `FieldGridDocument` → **`Wrap`** (backend's real name) = `{ rx, ry, start_x, start_y, wrap_info, values }`;
    `wrap_info` = `{ base_time, forecast_time, model, param, pressure, height }` (pressure XOR height). Wire; transient.
  - `FieldGrid` → **`Grid`** = `{ info, bounds, width, height, components: 1|2, data: Float32Array }`.
  - **`info`** is an inline object (camelCase mirror of `wrap_info`: `baseTime, forecastTime, model, param,
    pressure, heightFt`) — never used standalone, so not a named type. **Two interfaces total** in the file.
  - **`VectorField` deleted** — a vector field is a `Grid` with `components: 2` (interleaved
    `[u, v]`; data stride = `components`). `sampleVectorField` asserts `components === 2`,
    `sampleGrid` asserts `1` — catches both mix-up directions (today a scalar grid is silently
    assignable to `VectorField`).
→ **Status:** APPLIED (2026-06-16) — `wrap.ts`, `grids.ts` (`parseFieldGrid`→`wrapToGrid`),
`colormap-renderer.ts`, `layer-definition.ts`, `particle-system.ts` (+`components===2` guard in ctor),
`free-particles.ts`, `grid-particles.ts`, `field-data.ts`, **dev fixture** (`fixture-backend.ts`,
`grid-window.ts`, `tools/generate-fixtures.ts`) + all sample JSON regenerated to `Wrap`. Full typecheck clean.
Fixture now detects direction fields by `param === 'windDirection'` (was `units === 'deg'`).

**Note 2 — convert on receive.** `data/field-data.ts`.
→ **APPLIED (2026-06-16):** `httpResource<Grid>(req, { parse: raw => wrapToGrid(raw) })` — the resource
holds a `Grid`; `Wrap` never escapes the boundary. `parsedGrids` WeakMap + `gridFor` removed.

**Resolved — units.** Units live on the **layer**, not the grid (lead, 2026-06-16). kt→m/s conversion
dropped; `Grid`/`GridInfo` carry no units. `knotsToMetersPerSecond` now unused in `units.ts`.

**Resolved — naming.** `GridInfo.height` → **`heightFt`** (wire `Wrap.wrap_info.height` keeps the backend
name). No collision with `Grid.height` (rows).

**Resolved, no change:** `Float32Array` storage kept (sampling delta vs `number[][]` measured ~1.3×,
~0.6 ms / 200k samples; real reasons are GPU-texture upload + 2× memory, not throughput — accepted,
revisit only if needed).

**Note 3 — colocation + sampler API (2026-06-16).** `Grid` sat in `types/` (which is for backend DAO
shapes) with its ops in `utils/grids.ts` — felt disconnected.
→ **APPLIED:** `Grid` + its functions colocated in **`utils/grid.ts`** (renamed from `grids.ts`);
`types/wrap.ts` keeps only `Wrap` + `Bounds`. `sampleGrid`/`sampleVectorField` replaced by one
`valueAt(grid, lon, lat, interpolation: 'bilinear' | 'nearest'): number[]` — interpolation is the caller's
choice, orthogonal to `components` (returns `components` values via shared `bilinear`/`nearest` impls).
Colormap + hover use `'bilinear'`, particles `'nearest'` (look unchanged). 11 sites rewired; typecheck clean.

**Note 4 — Grid as a class; drop `components`; wind/waves as u/v (2026-06-16).**
→ **APPLIED:** `Grid` is now a **class** in **`objects/grid.ts`** — `constructor(wrap: Wrap)` +
`valueAt(lon, lat, 'bilinear' | 'nearest'): number`. Scalar only; `components` removed; `valueAt` returns a
plain `number`. `toVectorField` gone. Particle layers consume **two scalar grids** (`u`, `v`): wind → `u`/`v`
(m/s), waves → `waveU`/`waveV` (wave geometry + land mask). `ParticleSystem` takes `uField`/`vField`. Hover
derives speed/dir from u/v (`metersPerSecondToKnots(hypot)`, `atan2`). Fixtures emit `u`,`v`,`waveU`,`waveV`;
`windDirection` dropped. Backend to serve u/v directly (lead coordinating). ~12 files rewired; fixtures
regenerated; typecheck clean. Wind/wave look preserved (u/v in m/s = same magnitude particles saw before).

**Remaining:** none — Subject 1 fully applied.

### Subject 2 — Pure helpers

**Note 1 — dissolve `units/` (2026-06-17).** The `units/` folder/file held a central per-parameter
formatting registry (`ParameterDisplayRule` + `PARAMETER_DISPLAY_RULES`), which is layer business, not a
shared module.
→ **Decision (Option B):** formatting lives **on the layer**. Each catalog entry gains a `format` fn
(colormap `format(value)`, particles `format(u, v)`) and writes its own one-liner. Hover just calls
`layer.entry.format(...)` — no per-type branching, no parameter lookup.
→ **APPLIED:** `units/` deleted. Shared atoms → **`utils/format.ts`** (`MISSING_VALUE_TEXT`,
`formatNumber(value, decimals, suffix)`, `metersPerSecondToKnots`; dead `knotsToMetersPerSecond` dropped).
`format` added to `ColormapLayerCatalogEntry` / `ParticleLayerCatalogEntry` and to all 5 layer files.
Only consumer was `hover-readout.ts`. Typecheck clean.
- **Incidental:** waves hover now reads **m** (its u/v magnitude = wave height), was wrongly showing **kt**
  via the old shared `formatWind`.
- **Mild deviation flagged + accepted:** `format` puts a small closure into otherwise-declarative entries
  (vs §4.2 "declarative definition, not engine code") — presentation, not engine code; kept local.
- **Deferred — user-changeable units:** not built. When needed: a *quantity* on the layer (canonical unit)
  + a unit-preference store picking the active display unit/symbol; format = convert-then-render.
