# Slice 0 review — lead's amendment list (2026-06-10)

> **Status: pending tree approval, then execution.** The lead reviewed the Slice 0 result before
> reading the code and gave the notes below. Code clarity/maintainability is the explicit top
> priority ("the codebase must be perfect at all times; performance can be optimized later").

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

## Proposed tree v2 (pending lead approval)

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
    field-grid.ts                     pure grid decode/convert functions
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

Conventions locked on approval: every component = own folder + separate .ts/.html/.css; one concept
per file; interfaces colocated with their domain; nothing in `dev/` imported by product code —
only page templates may mount dev widgets. CLAUDE.md §4.1 + §5 updated accordingly
(engine-adapter path becomes `src/app/engine/`).

- Ask questions freely and often — he prefers answering many questions over re-explaining later.
- Highest standards on readability/maintainability; that is where he focuses most.
