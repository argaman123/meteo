# Slice 0 review — lead's amendment list (2026-06-10)

> **Status: EXECUTED 2026-06-10** (tree v4.1 locked in CLAUDE.md §5). The lead reviewed the Slice 0
> result before reading the code and gave the notes below. Code clarity/maintainability is the
> explicit top priority ("the codebase must be perfect at all times; performance can be optimized
> later").
>
> Execution notes: items 1–10 done. Pan misalignment (item 7) could **not be reproduced** after the
> rebuild — it most likely shared a root cause with the 2D bug (deck overlay going stale on
> projection change, now re-synced); the lead re-verifies by hand. Colorful water retuned to
> `#c3d5da` (item 11); the overzoom blur is inherent to the prebuilt z6 terrain raster — options if
> it bothers: cap zoom on colorful, find/build a deeper raster later, or accept.

## Code organization (top priority — tree must be clear before code review)

1. **Separate files per component**: template (`.html`), styles (`.css`), and logic (`.ts`) must be
   separate files — no inline templates/styles. Becomes a locked convention in CLAUDE.md §6.
2. **Clear, scalable folder tree**: proper folders for layers (file per layer type if needed),
   engine code, settings. Must scale to hundreds of layers, many pages, components, utilities,
   interfaces. Current tree judged "a huge mess" — restructure before implementation review.
3. **Quarantine non-product code**: everything that is mock/spike/perf-tooling (fixture wiring,
   demo controls, perf HUD) must be clearly separated from real product code so the real code can
   be read on its own. Utility functions that are genuinely reusable stay in the real tree.

## Functional changes

4. **Routing**: the map is the front page at `/` directly — no `/map` path, no redirect.
5. **Fixture model sizes are wrong**: big model should be ~1/4 the size of the current big one;
   the small model ~1/2 the size of the (new) big one. (Exact semantics — extent vs point count —
   clarified with the lead before execution.)
6. **Fixture realism**: temperature and especially wind should *somewhat* resemble real fields
   (not 1:1). Current wind direction field is "a mess" — replace with flow around synthetic
   pressure systems.
7. **Bug — pan misalignment**: panning the map (up/down) leaves the data layers misaligned
   relative to the basemap.
8. **Bug — 2D view**: after toggling to 2D, the basemap works but the data layers do not render
   correctly.
9. **Remove the attribution control** at the bottom of the map.
10. **Layer transparency**: make the data layer more transparent so the basemap clearly shows
    through on all three styles.
11. **Colorful basemap** is "a bit weird" (dark + light approved as great). Details clarified with
    the lead.

## Clarified with the lead (2026-06-10)

- Model sizes = **geographic footprint**: big model ≈ 1/4 the current area (Europe + N. Africa +
  Middle East), small ≈ 1/2 the new big one, nested inside; resolutions chosen to fit.
- Colorful basemap issues: **overzoom blur** (raster ends at z6) and the **water color/look**.

## Naming decisions from the lead (2026-06-10, round 2)

- Grouping philosophy: **hybrid** — junior-obvious type folders (`pages/`, later `components/`,
  `utils/`) plus dedicated domain folders only for the big machinery.
- No `shell/` folder: the frame (header + page slot) **is the root `app` component** itself.
- `features/` → **`pages/`** (one subfolder per page of the site).
- The machinery folder is **`engine/`** at top level (kills the map-page/map-domain collision).
- `dev/` quarantine approved as proposed.

## Naming decisions from the lead (2026-06-10, round 3)

- `layers/` is the **catalog**: one file per actual layer, **sub-foldered by layer type**
  (`layers/colormap/temperature.ts`…). Adding "relative humidity" = adding one catalog file;
  no engine work (its type's renderer already exists).
- Pure functions → **`utils/`**, sub-foldered by topic the moment it would otherwise be vague
  (`utils/grids/`, `utils/wind/`, `utils/units/`).
- Shared interfaces → **`types/`** (NOT `models/` — clashes with *meteorological* models),
  sub-foldered as it grows.
- Standing rule added to CLAUDE.md §2: always consult the official `angular-developer` skill +
  Angular CLI MCP (`get_best_practices`, `search_documentation`; registered in `.mcp.json`);
  locked project conventions win on conflicts.

## Naming decisions from the lead (2026-06-10, round 4)

- **engine/** approved as proposed.
- **layers/** grouped by *content category*, not render type: `layers/model/` (numerical-model
  fields) now; later categories like imagery (satellite/radar) and textual — exact names decided
  when they arrive. Reason: one layer (e.g. temperature) may later offer several presentations
  (colors / contours / high-low), so a render-type split is wrong.
- **types/** = backend data contracts (DAO shapes). Area-specific interfaces live *inside their
  area* (e.g. layer interfaces in `layers/`). Convention confirmed: colocate with the owning
  area; only shared/backend shapes go to `types/`.
- **utils/** was over-split: similar functions share a file (`grids.ts`, `units.ts`); no topic
  subfolders until vague; split later as files grow.
- **"Breathing system" standing rule** (added to CLAUDE.md §2 + memory): place things generally
  right; whenever a file/folder grows too big or cluttered, proactively suggest a reorganization —
  the lead decides every single time.

## Final decisions (2026-06-10, round 5) — TREE APPROVED

- The map page is the **front/home page**: `pages/home/` (`HomePage`), routed at `/`. Not "map".
- Tree v4 with that rename = **approved and locked** into CLAUDE.md §5.
- New standing rule (memory + applied from now on): when the lead asks for something that deviates
  from widely-agreed convention, say so — he wants to learn and choose well, not just be obeyed.

## Round 6 notes from the lead (2026-06-10)

- **Local model**: must be smaller than the wide model **in all directions** (inset margins on all
  four sides), not sharing edges. → lat 52→24, lon 0→50 @0.25° (≈half the wide area, fully nested).
- **Fields v2**: wind still unrealistic ("random flow + a perfect circle mid-globe" — the circular
  gaussian high). Replace with a **wavy westerly belt** (subtropical high south / polar lows north,
  meandering jet) + elongated drifting systems; temperature correlated with the wave (warm ridges /
  cold troughs).
- **Colorful basemap**: label text very hard to read → stronger white halos + darker text on all
  symbol layers.
- **For later (Slice 1+)**: a `dev/` mock that imitates the real HTTP requests behind the same
  data-access interface; the real backend serves **viewport-only (bbox) grids for model
  parameters** — recorded in `docs/decisions.md`.
- **Memory in-repo**: project-durable working rules live in CLAUDE.md (auto-loaded on any machine);
  machine-local memory keeps only machine-specific facts (installed skills, hardware quirks).
- Unit tests stay out for now (lead: simple conversions get checked at the backend level); the app
  will never go public (attribution note acknowledged).

## Center-circle investigation (2026-06-10) — proven upstream bug, lead decision pending

The particle circle pinned to the display center was investigated to the lead's standard
("make sure it doesn't have anything to do with the code"):

- **Minimal reproduction with zero app code** (`tools/repro/particle-center-circle.html` +
  `repro-entry.mjs`, bundle with
  `npx esbuild tools/repro/repro-entry.mjs --bundle --format=iife --outfile=tools/repro/repro-bundle.js`,
  serve repo root, open `?proj=globe`): bare MapLibre globe + deck.gl MapboxOverlay + WeatherLayers
  ParticleLayer with **synthetic uniform wind** → the circle appears at the display center.
  `?proj=mercator` → no circle. Conclusion: **weatherlayers-gl bug, globe projection only**;
  not our code, not the data.
- **Mechanism** (read from the shipped shader): in globe mode particles respawn at
  `destinationPoint(viewportCenter, sqrt(random + 0.0001) · viewportRadius, randomBearing)` — the
  `+0.0001` guard creates a permanent no-spawn disc (1% of viewport radius) at the display center,
  which empties out after a few seconds and reads as a circle/rosette.
- **Public-API mitigations tested**: `maxAge=40` (longer trails) only partially masks it — a bright
  clump remains at center. No layer prop controls the respawn region.
- **Lead's constraints**: never patch the vendored bundle; older versions are not acceptable either
  (globe support only exists since 2025.1.0).

Additional checks at the lead's insistence (all 2026-06-10):
- **Non-interleaved overlay**: circle persists → not an integration-mode issue.
- **Older versions**: the spawn-hole guard exists in every globe-capable version
  (2025.1.0 → 2026.5.2, five versions unpacked and grepped); pre-2025.1.0 has no globe support.
- **Low zoom (z1.8)**: a smaller but visible center clump persists → not zoom-masked.
- **Vendor's own demo** (demo.weatherlayers.com): flat mercator only, no globe toggle → most users
  never exercise the globe+particles path, explaining the silence.
- **Public issue tracker exists** (github.com/weatherlayers/weatherlayers-gl) with multiple
  globe/particle edge-case bugs (#27 globe perf, #29 globe pitch rendering, #9 particle high-zoom,
  #31 GPU-specific particles, #1 shader artifacts). Our exact bug is unreported; the channel is
  active and maintainer-responsive — that's where the report goes.
- **No equivalent library**: maplibre-gl-wind = particles only, not globe-proven; MapsGL =
  commercial/hosted; nothing else.

Options for the lead (decision pending):
1. **Report upstream (GitHub issue with our repro) + deadline**: if no fixed release before the
   wind layer matters to users, fall back to option 2. Single library preserved if fixed.
2. **Own particle renderer**: first-party deck.gl layer in `engine/renderers/`, same simulation
   with correct spawn math; one contained file pair behind the existing renderer interface;
   WeatherLayers stays for Raster/Contour/HighLow. ~1–2 days.
3. **All-custom weather rendering** (scrape WeatherLayers): consistent but weeks of expert WebGL
   work; not recommended for one understood bug.

```
src/app/
  app.ts · app.html · app.css         the frame itself: header + page slot (router outlet)
  app.config.ts                       app wiring (providers)
  app.routes.ts                       URL → page map ('/' = the map page)
  pages/                              one subfolder per page of the site
    map/
      map-page.ts · .html · .css      thin host: map container + product controls
  engine/                             THE adapter — only importer of maplibre/deck/weatherlayers
    map-engine.ts                     facade: init, basemap, view mode, add/remove layer
    style-loader.ts                   basemap style fetch + URL absolutizing
    renderers/                        one file per layer type (contours, barbs… each get a file)
      colormap-renderer.ts
      particle-renderer.ts
  layers/                             the declarative layer system (registry arrives in Slice 1)
    layer-definition.ts               layer interfaces
    wrap.ts                     pure grid decode/convert functions
  settings/                           injectable settings stores
    quality-settings.ts               adaptive-quality store (engine reads it; its UI is dev-only)
  dev/                                QUARANTINE — not product code
    perf-hud/
      perf-hud.ts · .html · .css
    spike/
      spike-controls.ts · .html · .css
      spike-data.ts
```

Reserved names (created when first needed, not as empty folders): `components/` (shared reusable
widgets), `utils/` (shared pure helpers). Future domain folders (units, geo, warnings, charts,
reporting, theming) are added when their slice arrives, following the same hybrid rule.

~~Conventions from v2 superseded by v3 below.~~

## Superseded: proposed tree v3

```
src/app/
  app.ts · app.html · app.css        the frame itself: header bar + page slot (router outlet)
  app.config.ts                      app wiring (providers)
  app.routes.ts                      URL → page map ('/' = the map page)
  pages/                             one subfolder per page of the site
    map/
      map-page.ts · .html · .css     thin host: map container + product controls
  engine/                            rendering machinery — ONLY importer of maplibre/deck/weatherlayers
    map-engine.ts                    facade: init, basemap, view mode, add/remove layer
    style-loader.ts                  basemap style fetch + URL absolutizing
    renderers/                       one file per layer TYPE
      colormap-renderer.ts
      particle-renderer.ts
  layers/                            THE CATALOG — one file per layer, grouped by type
    colormap/
      temperature.ts                 palette, defaults, parameter binding
    particles/
      wind.ts
  types/                             shared interfaces (NOT "models" — clashes with met. models)
    layer-definition.ts              LayerDefinition, ColorStop, catalog-entry shapes
    wrap.ts                    FieldGridDocument, FieldGrid, VectorField
  utils/                             pure functions, sub-foldered by topic, one function per file
    grids/
      parse-wrap.ts
      downsample-grid.ts
    wind/
      wind-to-vector-field.ts
    units/
      knots-to-meters-per-second.ts
  settings/                          injectable settings stores
    quality-settings.ts
  dev/                               QUARANTINE — not product code
    perf-hud/
      perf-hud.ts · .html · .css
    spike/
      spike-controls.ts · .html · .css
      spike-data.ts                  fixture fetching + composing catalog entries with fixture grids
```

~~Conventions from v3 superseded by v4 below.~~

## Proposed tree v4 (pending lead approval)

```
src/app/
  app.ts · app.html · app.css        the frame itself: header bar + page slot (router outlet)
  app.config.ts                      app wiring (providers)
  app.routes.ts                      URL → page map ('/' = the map page)
  pages/                             one subfolder per page of the site
    map/
      map-page.ts · .html · .css     thin host: map container + product controls
  engine/                            rendering machinery — ONLY importer of maplibre/deck/weatherlayers
    map-engine.ts                    facade: init, basemap, view mode, add/remove layer
    style-loader.ts                  basemap style fetch + URL absolutizing
    renderers/                       one file per render style (engine-internal split — approved)
      colormap-renderer.ts
      particle-renderer.ts
  layers/                            THE CATALOG — one file per layer, grouped by content category
    layer-definition.ts              the layer interfaces (area-owned, so they live here)
    model/                           layers fed by numerical weather models
      temperature.ts                 palette, defaults, parameter binding
      wind.ts
  types/                             backend data contracts (DAO shapes) shared across areas
    wrap.ts                    FieldGridDocument (backend JSON) + decoded FieldGrid/VectorField
  utils/                             pure functions; similar functions share a file, split when grown
    grids.ts                         parse, downsample, wind→u/v vectors
    units.ts                         kt→m/s (seed of the future Units module)
  settings/                          injectable settings stores
    quality-settings.ts
  dev/                               QUARANTINE — not product code
    perf-hud/
      perf-hud.ts · .html · .css
    spike/
      spike-controls.ts · .html · .css
      spike-data.ts                  fixture fetching + gluing catalog entries to fixture grids
```

Locked conventions (CLAUDE.md §4–6 updated on approval): every component = own folder + separate
.ts/.html/.css; area-specific interfaces colocate with their area, backend contracts in `types/`;
similar functions share a util file; subfolders appear only when flat turns vague (breathing rule);
nothing in `dev/` imported by product code (page templates may mount dev widgets); engine-adapter
rule path becomes `src/app/engine/`. Adding a model layer = one file in `layers/model/`.

- Ask questions freely and often — he prefers answering many questions over re-explaining later.
- Highest standards on readability/maintainability; that is where he focuses most.
