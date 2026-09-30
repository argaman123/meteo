# CLAUDE.md — Meteo Platform Frontend

> This file is **auto-loaded into context at the start of every session**. It is the project's
> operating law. It is intentionally prescriptive. When something here conflicts with a habit or a
> default, **this file wins**. For depth, read the linked docs in [`docs/`](docs/).
>
> **New session? Read this file (§11 = where we are), then [`docs/vision.md`](docs/vision.md).
> Nothing important lives only in chat — it lives here and in `docs/`.**

---

## 1. Mission & non-negotiables

We are rebuilding, from zero, the frontend of a specialized meteorological visualization platform
(a 3D globe with many colorful, animated weather layers, plus tables/summaries/reports). The old
app is Angular 10, built by ~25 rotating juniors over 6 years, and is a mess. The backend is being
rebuilt in Python; the old backend still runs the old site and is stable.

Three non-negotiables, in priority order:

1. **Handoff-able & junior-readable.** There is no hard deadline; *if the lead doesn't finish it,
   someone else will.* The code, conventions, and docs must let a different person — including a
   junior with little/no web background — pick this up cold and stay consistent. **This is co-equal
   with "it works."**
2. **Runs well for everyone**, including low-end **8 GB mini-PCs with integrated GPUs**.
3. **Looks great and absorbs new features for years.**

---

## 2. How we work (operating rules — always)

- **Plan → approve → build.** Every non-trivial task gets a short spec and the user's sign-off
  *before* code. Ask many questions up front. **Do not assume** — verify even when fairly sure.
- **Check the lead's ideas against convention.** When a request deviates from widely-agreed
  practice, say so briefly at decision time — he wants to learn and choose well, not just be obeyed.
- **Offer, don't choose.** Present ideas and options; the user approves — never silently pick, even
  with an obvious default. Keep summaries **concise**; explain only where a comparison needs it.
- **Knowledge intake is iterative.** Domain knowledge comes from the lead as we build (descriptions,
  occasional unclassified phone photos of the old app). Old code and real data **stay inside the
  closed network**; the lead supplies fixture data in the exact real formats — never fetch public
  substitutes or build mock infrastructure unasked. (Lead-asked exception, 2026-09-30: the model
  fixture reads real public ECMWF open data — see "Fixture model data is real ECMWF" in §11.)
- **Don't over-fragment.** Verify often, but do not split a small task into ten micro-steps.
- **The tree breathes.** Files and folders are placed "generally right", not over-split up front:
  similar functions share a file; folders gain subfolders only when a flat list turns vague. The
  moment a file grows too large or a folder too cluttered, **proactively flag it and suggest a
  reorganization — the lead decides, every single time.** Never restructure silently.
- **Consistency is law.** You may be creative when *choosing* a pattern. Once a pattern is chosen,
  it becomes the standard and is applied **everywhere** so a junior can copy an existing file and
  stay correct. Never let two ways of doing the same thing coexist.
- **Angular guidance comes from the official sources, always.** For any Angular work consult the
  official `angular-developer` skill and the Angular CLI MCP tools (`get_best_practices`,
  `search_documentation` — registered in `.mcp.json`), alongside the custom `angular-v22` skill.
  Where our locked conventions differ (e.g. separate template/style files), ours win.
- **Persist everything to `.md`.** Decisions and domain knowledge go into `CLAUDE.md` / `docs/`,
  never only in chat. The project must be resumable from any machine or session.
- **No code comments for now.** Clear names, small units, and the docs carry the meaning. Comments
  come in a later pass.
- **Function & data-completeness first, polish second.** Modern/clean by default, but never hide a
  value a user needs for the sake of a prettier layout — *"as nice as the need allows."*

---

## 3. Tech stack (locked)

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Angular 22** (standalone, **zoneless**, signals-first) | |
| Components | **spartan/ui** (`@spartan-ng/brain` primitives + Helm components copied into the repo) on CDK + Tailwind | Lead 2026-07-06, replaces the PrimeNG plan — see rule below |
| State | **Signals in one injectable `@Service` per domain** (signals + the methods that change them, co-located) | No NgRx; no separate stores layer |
| Map engine | **MapLibre GL JS + deck.gl** with **first-party weather-layer renderers** (WeatherLayers GL removed 2026-06; globe/3D deferred — deck's globe interop broken as of 9.3/9.4α, see plan.md) | Always behind the engine adapter |
| i18n | **No translation framework.** Each element authored in one language. **Bidi/RTL is mandatory** | Self-hosted Hebrew+Latin font |
| Styling/theme | **Design tokens** (CSS variables) → Tailwind + spartan's CSS-variable theme | Presets = declarative config |
| Testing | **Light/manual** + strict TypeScript + ESLint/Prettier; **no committed unit tests for now** — temporary Vitest checks verify pure units/geo/time logic during development, then are deleted | Lead 2026-06-10; wrong conversions remain a flagged hazard — revisit when Units/Geo modules land |
| Rendering | **Client-side SPA, no SSR** | WebGL needs the browser |
| Network | **Open internet during development**; delivery target is a closed network | Deps audited & vendored at cutover |
| Browser floor | **Chrome 112** (fleet-pinned) | `browserslist`-enforced; Chrome-for-Testing 113 smoke test; ratchet at cutover |

**Component-library rule (lead, 2026-07-06 — replaces the PrimeNG checkpoint):** UI is built with
**spartan/ui**. **If spartan has a component for it, use spartan's**; raw Tailwind/CDK only for
small adjustments or genuine gaps. Keep the code as simple as it can be. Helm components are
**copied into the repo** (shadcn model) — they are our code; RTL/theme fixes go directly in them,
no wrapper layer needed. `@spartan-ng/brain` supports Angular 21–22. The **spartan-ui MCP server**
(registered in `.mcp.json`) is the component/API reference — consult it when building UI.

Full rationale and alternatives considered: [`docs/decisions.md`](docs/decisions.md).

---

## 4. Architecture rules (the spine)

The system is built as small units, each with one responsibility and a clear interface
The rules that must never be broken:

1. **The engine-adapter rule.** `MapLibre`, `deck.gl`, and `WeatherLayers` may be imported **only**
   inside `src/app/engine/`. Nothing else in the app touches them. This is the lock-in hedge and
   the junior boundary. The map's public API (camera signals + `flyTo`/`setBasemap`/`init`) lives on
   **`MapService`** in `engine/`, which owns the maplibre instance and *is* the library boundary;
   other domains read its signals and call its methods rather than touching maplibre.
2. **A layer is a declarative definition, not engine code.** Adding a weather layer = adding a
   *definition* (id, type, data source, style/colormap, temporal behavior, defaults) to the layer
   registry. The adapter turns definitions into rendered layers. (Definition v1 in Slice 0;
   finalized with the registry in Slice 1.)
3. **All values flow through the Units module.** No raw numbers rendered anywhere (hover, tables,
   charts, readouts) without going through unit conversion/formatting.
4. **All coordinates/time flow through the Geo module.** Lat/Lon, DMS, MGRS, and times are
   formatted in one place, never ad-hoc. Times are **local only** (lead 2026-09-23: no Zulu, no toggle).
5. **State lives in a domain service** — one injectable `@Service` per domain that **co-locates its
   signals and the methods that change them**, in the domain's own folder (e.g. `MapService` in
   `engine/`, `LayersService` in `layers/`). There is **no separate `stores/` layer**: a domain is
   one inject — its signals *and* its functions together, never split into a data-service + a
   functions-service (the mainstream Angular pattern, e.g. `ngx-maplibre-gl`'s `MapService`).
   Components read its signals and call its methods; they don't hold cross-cutting state.
6. **RTL by construction.** Use CSS logical properties (`margin-inline`, `inset-inline`, etc.) and
   `dir`-aware components — never hard-code left/right. A direction island (e.g. the LTR time
   slider inside the RTL page) needs the CDK `Dir` directive on its wrapper, not a bare `dir`
   attribute — CDK/spartan components read direction from `Directionality`, which only sees the
   directive or the document default.

---

## 5. Project structure (locked with the lead, 2026-06-10 — "tree v4")

Hybrid grouping: junior-obvious type folders + dedicated folders only for the big machinery.
**The tree breathes** (§2): subfolders appear when a flat list turns vague — propose, lead decides.

```
src/app/
  app.ts/.html        # the page slot only (a bare router-outlet; no global chrome — each page
                      #   owns its own top bar, lead 2026-07-22)
  app.config.ts       # app wiring (providers)
  app.routes.ts       # URL → page map ('/' = the home page)
  pages/              # one subfolder per page of the site
    home/             # the front page: top bar + map view (layer-bar, time-bar, legend-bar, hover-readout)
      meteogram/      #   MeteogramService + the sheet + one folder per chart (meteogram-frame, meteogram-colormap, tabs)
      point-menu/     #   the map-click chooser (מטאוגרמה / סונדה בדקירה; later raw values) + the pin +
                      #     PointService (THE clicked point + which PointView is open)
      sounding-table/ #   SoundingTableService + the end-edge drawer with the radiosonde-style table
  services/           # domain services with no natural feature folder (TimeService)
  engine/             # rendering machinery — ONLY place importing maplibre/deck.gl
    map-service.ts    #   MapService: the maplibre map + camera signals + flyTo/setBasemap/init
    overlay.ts        #   Overlay: deck.gl layer host
    base/             #   building blocks looks are made from (Look, AnimatedLayer, GridIcons)
    looks/            #   one file per render style (colormap, wind-particles; later contours…)
  layers/             # THE CATALOG + the layers domain service
    layers-service.ts #   LayersService: layer/look activation + fetch/draw + shortcuts
    registry.ts       #   the keyed layers record + shortcut bundles
    base/             #   the shared definition machinery (Layer<D> + LookEntry, Shortcut)
    model/            #   ModelLayer machinery + one file per model layer (temperature, wind, …); future kinds get sibling folders
    polygons/         #   PolygonsLayer (+ EVENT_APPEARANCES record + SECTORS) + one file per forecast-event kind
    coordinates/      #   Coordinates readout layer (no looks; hover-only + persisted format control)
  objects/            # runtime data classes built from DAOs (e.g. Grid, MeteogramData)
  types/              # backend data contracts (DAO shapes); area-specific interfaces colocate
  utils/              # pure functions; similar functions share a file, split when grown
                      #   units.ts = the Units module (§4.3 — every rendered value flows through it)
                      #   geo.ts = the Geo module (§4.4 — formatCoordinates decimal/DMS/MGRS) + mercator/bounds math
                      #   settings.ts = setting() persistent signals + registerLayers (localStorage; keys derive from registry key + LookKind + field)
                      #   controls.ts = the Control vocabulary (options/percent/color) — setting-signals with UI metadata attached
                      #   interpolation.ts = fractionalIndex + bilinearAt over a flat Float32Array (Grid + MeteogramData share it)
                      #   contours.ts = the isoline tracer + levelsEvery level pickers; pointer.ts = pointerFraction(event)
                      #   thermodynamics.ts = standard atmosphere (feetAtPressure) + humidity formulas
                      #   wind.ts = metDirection (u/v → met "from" degrees) + windBarbPath (the barb glyph)
                      #   time.ts = ms/seconds unit helpers, snapping, findNearestTime/findNearestByTime (every loop's frame pick)
                      #   image.ts = equalize + decodeEqualizedImage (blob → equalized bitmap + optional IR grays)
  dev/                # QUARANTINE: spike/demo/diagnostics — never imported by product code
src/spartan/          # spartan/ui look layer: Helm components copied in by the spartan CLI
                      #   (one folder per component; imported as @spartan-ng/helm/*; vendored-ish —
                      #   rarely touched after the look settles, deliberately outside app/)
public/               # static assets (Angular 22 convention; served from /)
  basemaps/           # self-hosted styles + tiles (vendored)
  fonts/              # self-hosted Hebrew+Latin font
  fixtures/           # sample data in the real backend formats
  icons/
```

Future domain folders (e.g. geo) are added when their feature arrives, following the same hybrid
rule. **Where a service lives** (lead, 2026-09-24): shared across domains → `services/` or its
domain's folder (`engine/`, `layers/`); owned by one feature's UI → that feature's folder
(`pages/home/meteogram/meteogram-service.ts`, `pages/home/time-bar/time-bar-service.ts`). Adding a layer of an existing render style = exactly one new file in `layers/`.

---

## 6. Conventions (the chosen way — copy existing files)

- **Components:** standalone, `OnPush` (default in v22), signals for state, `input()`/`output()`
  functions, native control flow (`@if`/`@for`/`@switch`).
- **Every component lives in its own folder with separate `.ts` + `.html` files** — no inline
  templates/styles, even for tiny components (lead-locked; overrides the official "prefer inline
  for small components" guidance). A `.css` file exists **only when the component has real styles**
  (lead, 2026-07-22 — empty css files dropped); a bare `:host { display: block }` is expressed as
  `host: { class: 'block' }` in the decorator instead.
- **Interfaces colocate with the area that owns them** (e.g. layer interfaces in `layers/`);
  backend contracts go in `types/`. No global interface dump.
- **`dev/` is quarantined:** product code (`engine/`, `layers/`, `utils/`, `settings/`, the frame)
  must never import from `dev/`; only page templates may mount dev widgets. (One recorded
  exception: `environment.development.ts` registers the dev fixture-backend interceptor; prod
  builds swap the file out via `fileReplacements`, so no mock ships.)
- **Unix times are ms, end to end** (lead, 2026-08-06): the whole platform holds ms —
  `Date.now()` raw, `new Date(unixTime)` direct, duration math through the unit helpers in
  `utils/time.ts` (`hoursToMs`/`minutesToMs`/`daysToMs` + `msToHours`/`msToDays`, lead 2026-08-09 —
  TimeUnit-style, no naked `3_600_000`s). Identifiers say `Ms` (`stepMs`), never spelled out.
  Human-facing durations stay hours/minutes fields (`TimeWindow.backHours`, `stepMinutes`)
  converted at use. **Seconds exist only on the wire** (lead 2026-09-28): the real backend's
  satellite/radar routes speak epoch seconds, so those requests/parses convert at the edge through
  `msToSeconds`/`secondsToMs` — nothing past the parse holds seconds.
- **Naming:** descriptive, no abbreviations a junior wouldn't know. One concept = one name everywhere.
  Methods are verb+noun with the noun explicit (`showLayer`, `hideLook`, `toggleGroup` — never a bare
  `show()`/`activate()`); **state** uses the "active" adjective (`activeLayers`, `isLookActive`,
  `defaultActiveLayers`), **actions** use show/hide verbs (lead, 2026-07-13).
- **Nothing holds data while hidden** (lead, 2026-08-13): looks are registry-lifetime singletons,
  so any render cache on a look instance must clear in `Look.release()` — the Overlay calls it
  whenever the look leaves the map (Colormap's image memo, Contours'/Polygons' icon caches).
  Layer-side caches live in `fetch()` closures and die with the layer injector. A retained cache
  on a singleton is the leak pattern juniors copy — don't create one without its release.
- **Files stay small and focused.** If a file is doing two things, split it. (Old codebase pain.)
- **Constants live with their user** (lead, 2026-08-18): a const used by one class becomes a
  field of that class (`private readonly askMinutes = 30`), never a module const stranded above
  the file's interfaces where nobody sees it; a const with several users sits directly beside the
  class (or functions) using it. **Exception — colour palettes** (lead 2026-09-30, "more
  organized"): every layer/look palette is a module const directly above its class
  (`WAVE_HEIGHT_PALETTE: ColorStop[]`), exported only when another file uses it
  (`TEMPERATURE_PALETTE` feeds the meteogram) — never stops inlined in a constructor call. Known prior art left alone: wind-particles' lead-approved
  tuning-knobs block at the top of that file (2026-07-30).
- **Styling:** Tailwind utilities for layout/spacing; design tokens for color/typography; logical
  properties for direction. No magic numbers — use tokens.
- **Generic pure functions live in `utils/`, even with a single user** (lead, 2026-09-24): a
  helper nothing about which is feature-specific (array/interpolation math, pointer geometry,
  contour level pickers) goes to the matching `utils/` file so the next person can find it
  instead of writing a second copy — "lives with its user" above is for constants and tuning
  values, not for reusable functions. Feature-specific logic stays in its class.
- **Colors are authored as hex, never RGBA number arrays** (lead, 2026-08-24): every authored
  color literal goes through `rgba('#94a3b8', 140)` (`utils/color-scale`); a bare
  `[148, 163, 184, 140]` hides the color from the reader. Component math derived from an existing
  color (destructuring a fill to adjust alpha) is exempt.
- **spartan components are ours:** Helm components are copied into the repo — RTL/theme concerns
  are fixed directly in them, no wrapper layer. Thin wrappers only for third-party widgets we
  don't own.
- **No code comments yet** (see §2). One exception: the lead marks code he skipped during review
  with `// TODO: UNVERIFIED CODE BELOW` — his read-tracking, never remove or move it; only he
  clears it.

> Where a convention is not yet chosen, it is decided when the need first arises and then **locked
> here**. Do not invent a second way.

---

## 7. Dependency policy (lead-revised 2026-07-05)

- **Development happens on the open internet — use good libraries freely.** When a popular,
  well-fitted library genuinely helps, adopt it (lead sign-off as usual). No dependency budget
  during development.
- **The delivered app runs on a closed internal network** with no package registry. At cutover,
  every dependency is audited (transitive tree, no runtime phone-home/CDN/telemetry) and vendored.
  Prefer libraries that will survive that audit — that is the only constraint that remains.
- The shipped app self-hosts **all runtime assets**: fonts, icons, basemap tiles/styles. No runtime
  CDNs, no Cesium ion, no Mapbox.
- Standing note: **Turf.js** (`@turf/*` modules) is the chosen geo-geometry library — adopt the
  specific modules when the first polygon-shaped feature lands (warnings, AOI, measurements).
  Hot-loop bbox arithmetic stays hand-written (`utils/bounds.ts`) — GeoJSON allocation per call is
  wrong at 60 fps.

---

## 8. Performance budget (enforced)

- Target **60 fps** with **≤ 5 layers + 1 animation** on an **integrated GPU @ 1080p** (4K only on
  stronger hardware; resolution scales with the machine).
- **Adaptive quality knobs** (particle counts, texture caps) + a dev-toggleable **perf HUD**
  (FPS/memory) ship from Slice 0 — the target fleet isn't directly testable, so tuning is config-only.
- **Looks are never sacrificed globally for the weakest machines** (lead, 2026-07-06): the few
  low-end PCs get feature/effect scaling via the quality knobs; perf concerns about visuals are
  *flagged* at decision time, never silently applied.
- **Match or beat the current Cesium app's responsiveness.**
- The Slice 0 spike validates the engine by **best-effort measurement + reasoned assessment**
  (no direct target-hardware access) before we build deep.

---

## 9. Anti-patterns to avoid (lessons from the old app)

- Giant multi-responsibility files/components. → Keep units small and single-purpose.
- Multiple inconsistent ways to do the same thing. → Consistency is law (§2).
- Direct coupling to a rendering library throughout the app. → Engine-adapter rule (§4.1).
- Undocumented tribal knowledge. → Persist to `docs/` (§2).
- Hard-coded left/right, units, or coordinates. → Use the Geo/Units modules and logical CSS.

---

## 10. Where things live

- **Product context (why it exists, users, usage):** [`docs/vision.md`](docs/vision.md)
- **The plan (full task pool, dynamic priorities):** [`docs/plan.md`](docs/plan.md)
- **Technical decisions & rationale:** [`docs/decisions.md`](docs/decisions.md)
- **Domain knowledge:** [`docs/domain/`](docs/domain/) (meteorology, units/coordinates/time)

---

## 11. Current status

**Working mode (lead, 2026-07-07): build forward, one small task at a time.** The current
implementation is the accepted baseline. The original Angular 10 site is the **destination**.
[`docs/plan.md`](docs/plan.md) is the **full task pool** — everything left, one list, each item
carrying a rough **dynamic** priority (Claude adjusts it as the app evolves, or asks; no stages,
no predefined steps — those proved too rigid). The lead picks the next task by moment and mood —
priorities are never inferred silently. Each task: questions first, built small, verified
interactively with the lead, committed on his approval.

**Real backend contract (2026-09-28, lead: "take a look at the backend"):** every request now
calls the **real hzy-liba routes** (Python FastAPI at `~/Desktop/code/hzy-liba`, the standard;
MagenS Java only for what Python lacks) — the invented `/api/*` contract is gone, and the dev
fixture answers the real paths (`BACKEND_PATHS` + a `ROUTES` regex table in
`dev/fixture-backend/fixture-backend.ts`), so cutover = delete the interceptor + proxy the paths.
**Full route/shape map: [`docs/backend.md`](docs/backend.md); what we asked the backend team for:
[`docs/backend-asks.md`](docs/backend-asks.md)** (5 asks — U/V wind, point events, nearest air column, full-resolution map grids, `Wrap.limit` start; one-liners,
lead: "its humans"; the fixture serves each asked shape). **`/api` is never the right request**
(lead). Rules (lead): each backend-vs-us
difference is decided case by case; asks are written in the backend's own idiom. **Wire types
mirror the wire** (`types/`: `Wrap<I>` + `ModelWrapInfo`/`RadarWrapInfo`, polygon events as
`{ type, parameters, events }`, `AirLevelData`, `SatImage`, `RadarEntity`, obs
`{ coords, params }`); `Grid<I>` keeps `wrap_info` verbatim as `info` and reads geometry by the
wire's formula (`lat = start_y + ry·row`, rows flipped when `ry > 0` — the backend is south-first).
Per area: **models** `Model.Local = ECMWF` / `Model.Wide = BIG_ECMWF` (coverage box still the
placeholder), params `TMP`/`SURFACE_TMP` (surface asks the SURFACE_ variant, the backend's own
rule)/`U`/`V`/`HGT`, heights → `/model/data_with_flat_heights_with_limit/…`, pressures →
`/model/data-limited/…/MB500/…` at the nearest 3 h model time (lead: no time interpolation there,
snap), bbox as `min_lon…max_lat`; **meteogram** one `/model/air_column_in_between` request feeds
both the temperature and wind tabs (`MeteogramService.column`; `MeteogramData.fromAirColumns`
interpolates each model time's pressure levels onto the 1,000-ft ladder by `modelHeight`);
**sounding** `/model/air_column_nearest?forecasttime` (backend ask 3 — lead: the backend picks the
nearest model time, never us), its `time` shown in the header (surface row dropped,
wind radians+kt converted to u/v on receive for interpolation, RH from the wire); **polygons** sectors
`SECTOR-DEV` מקומי / `SECTOR-BIG` אזורי (bounds from MagenS), `get_maps_times` filtered to
DISTRIBUTED, `drawnEvents` flattens fog out of clouds and drops unknown/obsolete types,
`mapValidity(startTime)` (−1h/+2h) is the one validity rule for map + meteogram blocks, eights
ranges ("2-4/8", opacity by middle), rain types linear on the ramp (one `RAIN_TYPES` list: type + Hebrew name), haze surface =
base 0; **satellite** אוטו channel = the `/satellite/getConfiguration` schedule entry active at the
image time (MagenS's getConfigurationNativ logic, ported; IR10.8 otherwise), picker IR / FLC (FLC is
an ordinary `source`), **one satellite at a time** (lead: satellites never mix — the schedule
entry's `satellite`, else 8; the other only when the first returns no images), `filterBy?sat_id` →
`getImageBy` raw PNG, loop bounds from `/satellite-sectors/get-all`,
IR calibration = the backend's `gray // 2 − 80`; the schedule pick + sector-bounds reading live in
`layers/satellite/satellite-configuration.ts` (split 2026-09-29, lead: the layer hit 300 lines); **radar** `get_time_range_to_live_radars`
(flattened, deduped by fileName) → `POST /radar/get_wrap_for_entities` per frame, negatives are
flagged noise — hidden unless the look's **רעש** toggle draws them as |value|; **observations**
`getDataByParam` (ms, `cache=false`, window `[frame − 60 min, frame)`),
clouds show every layer. **Never code around local dev state** (lead 2026-09-29): the site is not in
production and never assume it is — no migrations/self-heals for stale localStorage; clear it instead.

**The product today:** 2D map (globe/3D deferred — the 2026-07-23 spike found deck's interleaved
overlay renders our looks broken on maplibre's globe; details on the plan.md row), self-hosted
basemaps, dev fixture backend, and the layer/look data pipeline —
layer kinds subclass the generic `Layer<D>` (name, looks, timeWindow, `hover(data)`, `fetch()`;
2026-07-15 split): `ModelLayer` (D = `Grid[]`) carries `parameters` and fetches grids per
parameter (bbox-windowed); the **model resolves from the view bbox** — local when the bbox fits
inside `LOCAL_COVERAGE` (`containsBounds`, `utils/geo.ts`), wide otherwise (lead 2026-07-27: auto
only, temperature's manual מודל picker removed; a zoom threshold was tried first and rejected the
same day — zoom is blind to coverage, whereas a bbox that fits the local box *is* the zoomed-in
signal; coverage is fixture values for now, real bounds from the lead later); future kinds
(satellite/radar/observations) implement their own `fetch`/data. A `Provider<I>` shapes each layer's data into each look's input — the
data side is untyped in the class; each definition annotates its lambda (`(grids: Grid[]) => …`),
so looks and providers stay source-blind; `Look<I>.deckLayer()` produces the rendered layer; keyed
registry + `LayersService`. Layers: temperature colormap; wind = speed colormap + canvas-trail
particle look.

**Wind look v2 — GPU trails (2026-07-30, lead-verified: fullscreen 60 fps, look approved):** the
2026-07-05 canvas technique dropped to ~30 fps on high-res displays (30k Canvas2D segment strokes +
a ~10 MB full-bitmap GPU upload per frame); rebuilt as a **first-party GL pipeline** in
`looks/wind-particles.ts`, ordered most-important-first (lead): `WindParticles` look →
`WindParticleLayer` wiring → `ParticleSim` → shaders + `TrailRenderer` (the sealed GPU box —
marked `// TODO: UNVERIFIED CODE BELOW` by the lead's convention). `ParticleSim` keeps the approved
simulation verbatim (prime-stride even spawning, speed clamp, lifetimes; the crumb-trail
bookkeeping is gone — a dying particle just respawns writing a degenerate segment so no teleport
streak) and emits geo lon/lat segments; `TrailRenderer.paint(segments)` uploads **32 KB** of
positions and runs two passes on a ping-pong framebuffer pair — fade the previous frame, then draw
the newest segments as **instanced quads** (perpendicular-expanded in the vertex shader with
smoothstep soft edges; WebGL native lines are 1 px only, `LINE_WIDTH` 1.75 was picked by eye as
the midpoint, then lead-retuned to **2.5** on the MacBook 2026-08-23 — "still way too small" even
dpr-true) — and its constant `Texture` feeds the same `BitmapLayer` warp (mercator-banded y).
Two hard-won shader rules: the fade decays **alpha only with rgb pinned white** (multiplying rgba
grays old trails), and the decay is **floored at 8-bit resolution** (`floor(a·DECAY·255)/255`) —
otherwise low alphas round back up and paint permanent residue on the map. **Speed → screen motion is compressed** (lead 2026-09-30, on real
ECMWF jets: fast trails were "insanely big", slow ones "hard to spot"): per-step length =
`min(13, 3.5·speed^0.3)` (was linear clamped 3–25 m/s, an 8× spread where every jet hit the cap;
now 2 m/s → 4.3, 10 → 7, 50 → 11.3 — ~2.6×; first cut was 5·speed^0.3, lead: "a bit too fast",
scaled ×0.7; a pure √ was offered but can't shorten jets and
lift calm winds without capping early). Tuning knobs at the top
of the file: `COUNT` 2000, `DECAY` 0.94, `LINE_WIDTH` (css px — the shader bakes `× dpr` since
2026-08-19; trails were half-width on the hidpi MacBook); texture = bounds' screen footprint × dpr
capped 4096. The GPU passes run from the rAF tick on the shared luma device (state-tracked
alongside maplibre — if other layers ever glitch while wind animates, move the passes into deck's
draw cycle). `GeoCanvas` died orphaned. `AnimatedLayer` (rAF loop, `step(dt)` + `rebuild()`)
unchanged; HMR still leaks orphaned rAF loops — refresh clears; production teardown correct via
`finalizeState` (which now also destroys the GPU resources).

**Time scrubber (2026-07-06, lead-verified):** generic
`TimeService` in `services/` (tools + window merging only — no layer knowledge; windows are pushed
in), `Layer.timeWindow` per layer (default 24/96/3h; may move to menu-side later — lead leaning
menu, layer chosen for now because cadence is data-nature), `Inputs.time()` feeds `Layer.request`
(no more `Date.now()`), `utils/time.ts` (snap/clamp/format — future Units/Geo seed).
**Time bar redesigned 2026-07-26 (lead spec):** a **full-width bottom strip**, no longer a
floating card (legend + perf HUD sit at `bottom-24` to clear it). The slider is gone — the track is
a **zoomable timeline** drawn by hand: `view` (a start/end signal) is zoomed by wheel around the
cursor (span clamped 3h…20 years) and panned with shift+wheel. Ticks come from
`timelineTicks(start, end)` in `utils/time.ts` — a **TICK_LEVELS table** picked by span, each row
pairing a *minor* unit+step with the *major* unit above it: hours+**days** → days+**months** →
months+**years** → **years** (lead 2026-07-26: always two levels, the bigger one bold). Both series
are generated by walking a `Date` cursor aligned to the major unit, so a month/year boundary always
gets its own tick — d3-scale's `ticks()` was tried first and rejected: its interval choice drifts
between levels (duplicate day labels, or day labels with no month marker). Levels are tuned to
**≤ ~12 ticks per view** (lead 2026-07-27: fewer ticks), and when a month-minor view contains no
year boundary the **first month tick is promoted** to a bold "חודש שנה" major — month ticks never
appear without a year showing up somewhere. Minor labels are dim
and light, majors bold with a taller mark. Label vocabulary is the lead's (2026-07-26):
`12:00` / `ו 31.7` (weekday letter from `WEEKDAY_LETTERS`, hand-built — Intl's narrow weekday adds
a geresh and comma and is wider) / `אוגוסט 2026` as a major, bare `אוקטובר` as a minor / `2027`.
Minors falling within 5% of the span of a major are **dropped**, since a wide major label
("אוגוסט 2026") otherwise collides with its neighbours; verified collision-free by measuring
label boxes across 30 zoom steps.
Positioning is pure `left: %` inside a `dir="ltr"` island, so no width measurement is
needed. The data window paints as two bands — **past orange, future sky-blue** (lead's colors; note
the theme's `primary` is near-white in dark mode, so tinted-primary bands were indistinguishable) —
with `now` an emerald line at their seam; **scrubbing is
clamped to the data window** even though the view can zoom past it (lead 2026-07-23). Pointer model
(lead 2026-07-26): **drag the track = pan, click without moving = jump to that time, drag the
handle = scrub** (commit on release only, mid-drag preview from a local scrub signal) — the
click/drag split is a 4px threshold on a `pending` drag mode. Above the track:
the local time — **the readout itself is the now button** (filled while live, click = back to now;
the separate עכשיו button is gone, lead 2026-07-26) and no relative "בעוד 3 שעות". That readout
**rides the handle**: it sits in the track's wrapper at the same `left: %`, lifted above the strip
so it overlays the map (lead 2026-07-26), clamped to 7–93% so it never leaves the screen at the
edges and hidden when the handle scrolls out of view. It is wrapped in a **plain positioned div**
with the `hlmBtn` inside — spartan's `transition-all` otherwise animates the moving `left` and the
chip visibly trails the handle (an Angular `[style.transition]` binding on the button is silently
dropped, so the wrapper is the fix); the wrapper moves at 0s, the button keeps its 0.15s for the
live-state color change, and rides at `-top-10` so it fully clears the strip (lead: "a bit
higher"). The six step buttons are a mirrored 2-row grid beside the track on the bar's right,
laid out like the old site's block (lead's reference photo, 2026-07-26): row 1 `‹3h ‹ › 3h›`
(4 columns), row 2 `‹24h 24h›` (each spanning two). The strip is near-flush (lead 2026-07-27):
`pt-1` only, track h-9 to the bottom edge (tick labels `leading-[13px]` at `top-px`, baseline
`top-4`), h-4 buttons nest inside the track's height — 41px total (was 89 as a centered card).
The past/future bands run `top-4 → bottom-0` — **below the text line only**, so the label row
stays on the card background like the old site's bar.
**Live mode**: `TimeService.live` starts on and re-arms on that click,
a 60s interval advances `now` (and `currentTime` while live), any scrub/step drops it (lead:
"until you scrub away"). Step controls are ±map / ±3h / ±24h, where a *map* step walks
`TimeService.timeStops` (multi-cadence v3 below); a play button waits for the
animation/imagery-loops feature. `jumpTo` snaps via `snapJump` onto the window-bounded stops, so
edge snaps can never leave coverage. **Multi-layer stacking landed
2026-07-14 (complete, 5 steps):** layers stack; `Look` carries a `kind` and the `Overlay`
stable-sorts by the `LookKind` rank order (image < colormap < contours < particles < polygons <
icons < text — lead reordered contours below particles 2026-07-14); colormap-kind looks are mutually exclusive across layers; state vocabulary is
*active* (`activeLayers`/`activeLooks`/`isLookActive`), actions are show/hide verbs. Definitions
carry `Layer.name` + per-look `{ look, name, checked }` — `checked` starts as the definition default
and mutates in place as the layer's session memory of its checkbox states (kind vocabulary:
צבעים/אנימציה/קונטורים).
The layer card: foldable groups (a layer's control/look rows sit in an indented container behind
a thin start guide line — tree look, lead-picked from three screenshot mockups 2026-07-22;
**simplified 2026-08-23 through four lead iterations** to: an enabled layer shows ALL its rows
— every look, checked or not, plus controls — with a chevron to collapse-all; a disabled layer
shows no rows AND no chevron (`groupStates` Map gated by `isLayerActive`, the old
only-active-looks filtering deleted), checkbox per look, and
**generic controls** (2026-07-15): looks/layers expose `controls: Control[]` — typed descriptors
rendered by one template switch — `options(initial, choices, label?, presentation?)` (a persisted setting-signal with metadata
attached; `OptionsPresentation` = Cycle click-cycle (named Toggle until 2026-08-19) / Select popup list / Table — a titleless
row of all choice buttons that wraps when space runs out; one `cycleOptions` serves particle
speed ×0.5/×1/×2, the coordinates פורמט is a Select, the polygons גזרה is a Table; **`toggle(initial,
label?)`** (2026-08-19) is the boolean control, rendered as an `hlm-switch` — labeled toggles get
the labeled-control row, unlabeled render inline; the copied switch needed two fixes (ours to fix,
per the spartan rule): its fresh helm styles target the new brain's `data-checked` boolean attrs
while our pinned brain 1.0.4 stamps `data-state=checked|unchecked` (selectors translated), and
the thumb was rem-sized (`size-3` = 12.75px at our 17px root) inside a px-literal track so
`calc(100%-2px)` overshot 1.5px (thumb now `size-[12px]`/`size-[16px]`, ON/OFF rest symmetric at
1px, measured); the slide is `transition-[translate] duration-200 ease-in-out` (a "transition
permanently wedged at currentTime 0" scare during verification turned out to be a stale headless
Playwright browser freezing ALL css transitions — fresh instance animates, sim-sampled eased
curve both directions); it self-heals a non-boolean stored value back to
the initial (the radar עיגול key previously held 'shown'/'hidden' strings); layer controls
render **above** the look rows and stay visible while the layer is active, since pickers
aren't togglable; look controls split by label (lead 2026-08-18): **unlabeled ones render inline
at the end of their look's row** (opacity %, the particles' ×1 speed), **labeled ones get their
own deeper-indented row under the look** (radar's עיגול) — same row anatomy as layer controls, so
a labeled knob never crowds the checkbox line), `percent(initial)` (colormap
opacity popover; image memoized per grid so drags cost a uniform), and `{ type: 'color' }`
(contour identity squares). Caution: control metadata attaches via `Object.assign` onto the signal
function — `name` is read-only on functions, hence the `label` field. Hover readout: one labeled line per active layer.
Trail canvas sizes to the bounds' on-screen pixel footprint (capped 2048) — particle thickness no
longer varies with window size. Geopotential-height layer (wire name `hgt`, 1000 hPa, sky-blue
contours every 20 m) joined on the contours look. **Shortcuts (`layers/base/shortcut.ts` + registry
`shortcuts` record) are package-deal bundles and the primary UX (vision.md):** a קיצורים section
tops the menu; pressing מזג אוויר applies exact per-layer look sets (`{ layer, looks: LookKind[] }`);
pressed state derives (all member layers active) so turning a member off releases the pill while
the rest stay; settings tweaks don't break the package; startup showed the weather shortcut until
2026-07-16 — it now shows the polygons layer (see below).
The look⇒layer seam resolved itself: shortcuts activate layers, the invariant stands. Watch:
`LayersService` is growing — propose a split when it next grows (lead, 2026-07-14).

**Multi-cadence time v3 (2026-07-30, lead-verified after a full line-by-line review):** per-layer
time strategies on one contract. `Layer.fetch` returns `Signal<D | null | undefined>` — platform
vocabulary only (`undefined` = loading, the map keeps the last drawn frame + the time readout
pulses; `null` = deliberately nothing, looks removed, hover/HUD skip; the review deleted the
bespoke OUT_OF_RANGE symbol/`Fetched` alias/`loadedValue` helper in favor of null + Angular's own
`hasValue()`/`value()` idiom — null is therefore reserved, a layer's data type may not be
nullable, which is why `Coordinates extends Layer<true>`). `Layer.relevanceOf(data): TimeRange |
true` states the data's own validity (models: `forecastTime` ±1.5h; polygons: wire
startTime–endTime; `true` = timeless) and `LayersService.keepIfRelevant` gates every data signal
against `currentTime` in one place. **Models** (lead + backend lead): one request per parameter
carrying just `time` — the backend interpolates any requested hour between its 3h frames, so
`stepHours: 1` (hourly jumps, frame times stable across runs); a request error means "nothing
there" → null. `wrap_info.forecast_time` is an **absolute unix time**. **Polygons**: two-phase —
`/api/polygons/hours?sector&start&end` over the merged window (`Inputs.window()` replaced
`now()`; re-asks when the 5-min-quantized window shifts, a layer widens it, or the sector flips —
no interval machinery), then `findNearestTime(times, cursor, 3)` picks `mapTime` and the data
request carries the **map's real time**; an empty past yields null with zero requests (the
standing 404 noise is dead). Its list is published as `Layer.forcedTimes` → deduped into
`TimeService.forcedTimes`. **Jumps**: `timeStops` = the forced times **override** (a layer that
cares about real maps forces the timeline — stops are exactly its times, lead 2026-07-30: never a
union, no in-between grid stops) else the declared step grids over the window (`TimeWindow =
{ backHours, forwardHours, stepHours? }` — cadence optional, list-layers omit it) else a 3h
default; step/snap/live all pick from that one sorted list. `currentTime` is a `linkedSignal`:
follows `snapJump(now)` while `live`, holds the manual pick otherwise (boot self-corrects once
layers register). The `window` computed carries a value-`equal` — without it, object-identity
churn silently re-triggered `httpResource` loads (an invisible infinite hours-refetch loop:
resources reload on request-identity change and guarded reads log nothing). **Lifecycle**: each
shown layer gets a `layerInjector` (`createEnvironmentInjector`), destroyed on hide — its
resources tear down with it (hidden layers used to keep fetching forever). Convention (lead):
effects are declared at the top of a service next to the state they watch. Perf HUD is on by
default (Ctrl+Alt+P toggles) and shows each timed layer's validity range, dimmed when hidden.
Fixture: `/api/hours` + `/api/polygons/hours` (center = full 3h; north = sparse [0,3,12,21,45]h
to exercise real-map jumps), grids computed at the exact requested time (fractional forecast
hours). Satellite/radar arrive as new Layer kinds with their own fetch strategies (past-only
"latest ~30 min" asks, multi-frame steps, always animated) on this same contract.

**Fixture model data is real ECMWF (2026-09-30, lead: "i'm starting to not like the made up
maps"):** the analytic `synthetic-weather.ts` (and its GFS wind file + dead wave code) is gone.
`npm run ecmwf:fetch` (`tools/fetch-ecmwf.py` — Python in a gitignored `tools/.venv`, the one
non-Node tool: GRIB2 has no usable Node decoder) pulls the latest ECMWF IFS open-data run
(0.25°, CC-BY 4.0, dev-only — never ships), crops the BIG_ECMWF box, and writes 16-bit
scale/offset files per (field, step) + a `manifest.json` into **gitignored
`public/fixtures/ecmwf/`** (~290 MB, 0–144 h every 3 h): pressure fields t/u/v/gh/r on
1000…100 mb (12 levels) and surface 2t/2d/10u/10v/msl. `dev/fixture-backend/ecmwf-weather.ts`
answers the model routes from it: surface = the surface fields (SURFACE_RH from 2t/2d), feet
heights interpolated in height through each point's `gh` profile, mb levels read directly,
heights-route times interpolated between 3 h steps, ~70×70 resampling unless `reduction` (then
the native 0.25° grid); both air-column routes read the same files (dewpoint from t + r). **Time
is re-anchored (lead):** the run's base shifts by WHOLE DAYS to ≤ 24 h before app load (keeps the
diurnal cycle true — hence 144 h fetched, not 120, so the 96 h future stays covered); re-fetch only
for fresher weather. Missing folder → console error naming the command, model routes 500. Both
models serve the same 0.25° data (the real local 0.1° grid isn't public). Raw RH overshoots
(−4…125%) pass through as the backend would (clamped only inside the air column's dewpoint math).
The fetch writes to a sibling temp folder and swaps it in on success, so a failed re-fetch keeps
the old data. Polygons/observations/satellite/radar fixtures are
untouched; `land.geojson` stays (observations).

**spartan/ui adopted, chrome rebuilt on it (2026-07-06):** initialized via `@spartan-ng/cli`
(slate theme; dark is the default via `class="dark"` on `<html>`; CLI config in `components.json`).
Helm components are copied into `src/spartan/` (button, checkbox, dropdown-menu, popover, slider, switch,
utils so far; deliberately outside `app/` — it's the vendored look layer, rarely touched) and imported as `@spartan-ng/helm/*` through
tsconfig paths; ESLint's selector-prefix rules are off for that folder (spartan keeps its `hlm*`
selectors). Header, basemap switcher, layer bar, and time bar use `hlmBtn`/`hlm-slider`; selection
lists show the active item by switching `variant` (`default`↔`ghost`) + `aria-pressed`. The
custom color tokens in `styles.css` are deleted — spartan's CSS-variable theme is the only color
system (Heebo `--font-sans` kept; **since 2026-08-23 the stack is `'Source Sans 3', 'Heebo'`** —
the lead called Heebo's Latin/digits "super basic and defaulty" (accurate: Heebo's Latin IS
Roboto) and, across four rendered candidate rounds, went Manrope → DM Sans ("too childish...
it should look modern, clean, and professional") → **Source Sans 3 at weight 400 for ticks**,
picked from a replica of the legend card next to Inter/Plex/B612; Rubik and Space Grotesk
rejected en route. Latin+latin-ext variable woff2 vendored in `public/fonts/source-sans/` + OFL;
Hebrew still renders Heebo via per-glyph fallback — no wrapper spans; the three canvas-sprite
font strings (labels/contours/polygons looks) carry the same stack so map text matches the
chrome). **Chrome look — overhauled 2026-08-23 in a live lead-iteration marathon (replaces the
2026-07-06 full-bleed-map + frosted-floating-cards look): the map is a rounded window in solid
chrome.** Docked and SOLID (`bg-card`, no blur, no seam borders): the **right menu** — the layer
card became a full-height scrollable side panel (`start-0 top-12 bottom-14.5`, `w-48`; scrollbar
always-visible via webkit pseudo styling, thumb `bg-secondary`; a `dir="ltr"` scroller wrapping
`dir="rtl"` content puts it on the screen-edge side; content `px-3`, rows `gap-1.5`) — plus the
top bar and time bar. The **map canvas itself is rounded**: an inset wrapper (`top-12
bottom-14.5 start-48 end-0 overflow-hidden rounded-xl`) around the maplibre container —
maplibre's own css forces `position: relative` on its container and unlayered css beats
Tailwind's layered utilities, so sizing MUST live on a wrapper div; bonus: fetch bboxes now match
the truly visible map (radial-gradient corner pieces were built first and replaced by this; note
the root is 17px, so `top-12` etc. are rem-true — pixel math at 16px caused an alignment round).
**Floating windows** (legend, level rail + chip, loop pill, hover readout, perf HUD) are frosted
`bg-background/70 backdrop-blur-lg` with **centered ambient shadows**
(`shadow-[0_0_12px_rgb(0_0_0/0.45)]`, 8px on small chips) — blur cost is now only these small
surfaces. **Nested-blur rule**: a child of a backdrop-blurred element cannot blur the page
behind it — a card whose children must frost (the level chip) stays blur-free itself and puts
its frost on an `absolute inset-0 -z-10` layer inside an `isolate` card. **Dark palette re-tuned
to neutral gray** (lead-picked from a rendered ramp sheet, then live-nudged to the A/B midpoint):
card `oklch(0.195 0.005 260)`, background `0.153`, secondary/muted/accent `0.28`, chroma ≈ 0 —
the slate-blue cast is gone; light theme untouched (a dark/light toggle was built and removed
same day — lead: styling later, see Presets & theming row). **Buttons**: main rows (menu
layers/shortcuts) and top-bar icons use `secondary` when inactive (lead: visible button
affordance); tiny value chips and chevrons stay `ghost`; ghost lost its `aria-expanded`
background in our hlm-button copy (chevrons icon-only — this also killed a
hover-darkens-vs-lightens mismatch); secondary's hover lightens via `color-mix`. Top bar order,
leftmost first: **perf HUD toggle** (lucideActivity, `viewChild(PerfHud)` + public `toggle()`;
Ctrl+Alt+P still works), **basemap** (lucidePalette), coordinates. Legend gradient: bar
full-height with the label column top/bottom-aligned to it (`justify-between`), labels
weight-500; the open legend title gets the `secondary` fill. The old looks (2026-07-06 frosted
cards AND the pre-spartan custom chrome) are retired — do not imitate them.

**Chrome polish marathon (2026-08-24, six lead-driven rounds — refines the 2026-08-23 look):**
**Menu hierarchy**: active layer rows = white `default` fill + bold; inactive = the new **`soft`
button variant in our hlm-button copy** (`bg-secondary/50`, hover restores full secondary — added
because a dynamic `[class]` STRING binding on hlmBtn corrupts the variant classes; per-key
`[class.x]` bindings are safe, semantic states become variants); an expanded layer's rows sit in a
full-width bordered `bg-background/50` panel (dropdown feel — a wrap-box and behind-the-button
overlap were rendered and rejected); unchecked look rows mute their LABEL text + dim their
chips/switches at opacity-50 but never the checkbox (reads disabled otherwise); value chips are
`rounded-full border-border bg-muted/30` pills (the app-wide chip language — level rail's kft/mb
toggle and the loop pill's ×N speak it too); section headers are 11px tracked; שכבות is a
collapsible section (open by default, session-only state); scrollbar shows on hover only + a
static bottom mask fade. **Shortcuts are icon rows** (lucide icon per bundle, stored on
`Shortcut.icon` in the registry): מזג אוויר cloud-sun, **לוויין ומכ"ם** satellite (new bundle),
**עננות ותופעות** cloudy + **תצפיות** binoculars (new single-layer bundles — the lead wants them
one-tap visible; catalog rows stay icon-less, that asymmetry separates the species).
**Time bar**: bands are vertical fades (`from-*/25 to 75%` height, lead-tuned twice; a horizontal
corner-fade was tried and reverted); single-chevron step buttons with hairline separators
(`‹3h ‹ › 3h›`); 18px handle dot (integer — fractional sizes rendered a split stem on the lead's
display); glowing emerald now-line; **`hoverPreview`** = a faint line + time label at the SNAPPED
would-land stop while hovering the track (hidden while dragging; metaphor names like "ghost" are
banned — plain nouns); hairline **stop-marker ticks** along the track bottom at `timeStops` (now
public); tick labels edge-fade via mask; the handle chip's pointer stem is track-anchored at
`handlePosition` so it stays truthful when the chip clamps at 7–93%. **Loop pill redesigned**
(three iterations + a mocked 4-sheet): a column of a centered transport row — circular `soft`
skip buttons, larger `secondary` play/pause, divider, fixed-width ×N chip — over a full-width
3px progress track fed by `LoopPlayer.loopProgress` (raw-sweep fraction between first/last merged
times); a media-row and a conic ring around play were built and rejected. **Top bar**: tracked-caps
METEO wordmark; perf toggle ghost-when-off; **tooltips everywhere** via the vendored spartan
tooltip (`src/spartan/tooltip/`, `position` per placement): top-bar icons (perf includes the
Ctrl+Alt+P hint), step buttons (map-step pair includes arrow-key hints), loop pill, level rail.
**Basemap picker**: full-bleed rows — 380×90 self-captured thumbnails (`public/basemaps/
thumbnails/`, re-capture via Playwright when styles change) under a `bg-linear-to-l` darkening
overlay, label + inline indicator (`class="static"` — the helm indicator is `absolute end-2` and
collides inside custom rows otherwise), `mt-1 first:mt-0` spacing. **Motion pass** (Angular
`animate.enter`/`animate.leave` + keyframe tokens in styles.css: unfold/fold, expand/collapse
— the layout-squashing pair via max-height 200px for layer panels — pop-in/pop-out for legend
card + pill): שכבות section, layer panels, floating cards; legend BODIES animate nothing (both
ends removed — simultaneous fold+unfold jittered the card). **Adaptive ink** (`basemapBright`
module signal in map-service, written by `setBasemap` from the basemaps list's new `bright` flag;
dark=false, light/colorful=true): wind trails bake `inkOf(bright)` into both shaders (white on
dark, `#212429` on bright — TrailRenderer carries `bright`, `step()` rebuilds on flip with a
one-frame deferred destroy of the old GPU resources; a two-tone core+casing look was built three
ways and rejected: "no casing"); polygons' default separation outline (now look-side
`defaultOutline` — `PolygonStyle.outline` went OPTIONAL, the triplicated white outline left
cloud/fog/haze; precip/CB overrides untouched); radar coverage rings. Looks re-render on flip
because deckLayer runs inside the per-activation draw effect (signal read = dependency); deck
needs `updateTriggers` when the color sits in an accessor. **Convention (lead): colors are NEVER
authored as RGBA number arrays — always hex via `rgba(hex, alpha)`** (derived component math
exempt; contours casing converted in the sweep). **Obs labels** grew to 16px/22px sprites.
**Legend**: w-36 + truncated titles (chevron group shrink-0), collapsed titles show a palette
sliver (`sliverBackground` — smooth for gradients, hard-stop for swatches). **Hover readout**:
rounded-xl (radius sweep with the HUD); a legend-color dot per line was built and removed — "the
colors do not correspond to anything" at the cursor. **Perf HUD**: monospace 11px + a 60-sample
FPS sparkline (500ms cadence SVG polyline). **Menu row loading pulse** while a layer's data is
in flight. **Two machinery bugs fixed en route**: polygons' `timeWindow.backHours` 0→3 — with 0,
a polygons-only window started AT now, the hours ask couldn't see the currently-in-force map
(started in the past), and the exactTime relevance gate correctly nulled the future frame (other
layers' back-windows had masked this since the exactTime split); and `syncLoops` gained a
loading-guard — a live-tick refetch briefly empties all loop data (undefined), which read as a
loop-session death and reset a user's pause; while any active loop layer is loading and none has
times, the player now holds state (all-null relevance still ends the session, per spec).
Rejected in the marathon (don't re-offer): weekend timeline tint, count badge on שכבות, readout
dots/colors, crosshair cursor while coordinates active, "עכשיו" now-line label, אוטו chips
showing the resolved config value (needs a Control-vocabulary extension — the lead passed), zoom
pill on the map, prefers-reduced-motion, keyboard-help overlay, pressure-rail static labels,
per-basemap border ink.

**Sea-level pressure — לחץ מפלס ים (2026-09-29):** `SeaLevelPressure` (`layers/model/`), wire
`SLP` on the ordinary surface request (height 0 → the backend's script pins MSL, hPa) — overrides
`staticLevel = true`, so the level bar hides for it. Two looks: isobars every 2 mb (`Contours`,
stand-in `#e5e7eb`) and **מרכזים** — H/L center chips on the generic `Labels` look (the old tool's colors, lead
2026-09-29 from photos: L blue / H red; value = the RAW grid at the center through Units). Layer control **פירוט מפורט/כללי** (Table, lead:
full detail by default — 4 mb was tried and read "too low res" — but "less sensitive to small
changes" must be one click away): כללי feeds both looks
`grid.smoothed(16)` (the contour tracer's own `blurred`, now exported); hover always reads raw.
**Centers are always found on the smoothed field**, in both modes (the old tool's photos: the same
two L's in raw and smooth views, none on the terrain rings). **Full resolution** (lead, from photos
of the old tool's raw/smooth ECMWF maps — "way more detailed" than our 70×70): SLP overrides
`ModelLayer.reduction = 1` (sent as `reduction` — backend ask 4, assumed to exist for this map;
null on every other model layer), so מפורט draws the native grid; כללי and the centers work on
`grid.resampled(70, 70).smoothed(16)` — the old 70×70 look, independent of native size.
Full-resolution requests **pad the bbox by 0.25° on every side** (`fullResolutionPaddingDeg`, lead
2026-09-30: isobars stopped short of the screen edge — the backend's `Wrap.limit` crops inward to
cells inside the bbox and mislabels the crop's start, backend ask 5), so the native grid always
covers past the view and lines run off-screen. Fixture:
real ECMWF msl since 2026-09-30 (the synthetic terrain-noise mountains are gone with the synthetic
generator). Centers = `Grid.extrema(6)` over the pure `localExtrema` (`utils/contours.ts`): strict window
max/min with a scan-order tie-break (the fixture's 0.1 rounding made plateau peaks tie — no
labels until then), 2-cell edge margin. Catalog-only: SLP never replaces hgt in מזג אוויר (lead);
RH will later be mixed with it. **↑/↓ step the level** while the level bar shows
(`LevelService.stepUp`/`stepDown`, the time bar's `(window:keydown)` host idiom).

**Relative humidity — לחות יחסית (2026-09-30):** `RelativeHumidity` (`layers/model/`), wire `RH`,
follows the level bar; at the surface it asks **`SURFACE_RH`** (the backend's own rule — ECMWF
lists RH as missing at SFC, `ecmwf_model.py`, served by `SurfaceRHScript`), a second
`surfaceParameters` entry beside TMP. Looks: צבעים (0–100%, lead's direction: deep dark brown →
light green, near black → near white; retuned twice 2026-09-30 for spotting clouds by altitude — near-black
through 45%, steep brightening 60→100% (lead: the first 85% switch point was too high, "we dont
want to miss information"), "way more contrasty" like the old tool; stand-in stops inline) +
קונטורים every 10% (**on by default** — lead: "they are important"; labels read "70%" via Units; green `#4ade80` — lead: green for RH, the free contour hue). New
shortcut **לחות** (lucideDroplets): RH colormap + RH contours + SLP isobars + centers.
Fixture: real ECMWF `r` aloft, 2t/2d-derived at the surface.

**Waves — גלים (2026-09-30):** `Waves` (`layers/model/`), model `ECMWF_WAVE` through a מודל
Select with one choice for now (lead: the selector exists, more models later) — `ModelLayer.modelOf(bbox)`
is the hook (default = the local/wide pick). Wire `WAVE_HEIGHT` + `WAVE_DIR` (degrees "from") on the
heights route at height 0, `staticLevel = true`; the backend's linear time blend of direction is a
known, accepted flaw (lead: "use whatever the backend provides" — `docs/backend.md`). Direction is
never interpolated as an angle on our side: providers convert height + `WAVE_DIR` to a **travel
`VectorField`** (`u, v` = height × travel unit vector; `WindField` was renamed `VectorField` and moved beside `Grid`),
hover reads direction `nearest`. The colormap takes the radar's `blur` feather to soften the
70×70 grid's stair-stepped shore (a `reduction = 1` full-resolution override was tried and
dropped — lead: no need, the real backend ignores `reduction` until ask 4 lands). Looks: צבעים (0–8 m+ stand-in
blue→purple, land transparent) + **אנימציה = `WaveCrests`** (`engine/looks/wave-crests.ts` — Windy-style crest arcs,
lead-confirmed: one mask-tinted arc sprite on an `IconLayer`, **one crest slot per cell
of a 40×30 grid over the view** (each slot always respawns inside its own home cell — random
spawning and a prime-stride cursor both left empty patches, lead: "a lot of areas feel empty") on an
`AnimatedLayer`, fade in/out over a 2–4 s life; lead-tuned 2026-09-30 after "way too big, way too
crowded" on a wide view: 9 px, alpha ≤160, 0.8%-of-view per second, and a slot born on land stays
an invisible `shown: false` crest for its life instead of re-rolling onto the sea, so density is
per VIEW area — a small sea no longer packs all slots). **A crest never turns** (lead: "just like a wave") — bearing and
velocity are fixed at birth, it glides straight and dies on land/off-view (one NaN check). Lead's
simplification round cut the speed chip, height-scaled alpha/speed (no wave period on either
backend anyway), and the fixture's nearest-sampling for `mwd`; **size came back** the same day
(lead: the colormap isn't always shown behind them) — 7 px calm → 16 px at 4 m+, fixed at birth. On by
default.
**`AnimatedLayer` landmine** (found here): the rAF loop is bound to the FIRST layer instance, and
deck hands `state` to each new instance on a props change — so `step()` must read only `state`
(and props that never change, like a control signal), never data props. Crests first read
`this.props.u` in `step` and kept respawning inside the first view's bounds; the field now lives in
state (`rebuild` stores it), the way wind's `ParticleSim` always did. Also: the crest array keeps its
identity between frames, so every accessor that changes per frame must sit in `updateTriggers`
(a dropped `getAngle` trigger froze each slot's first angle);
קונטורים every 0.5 m (cyan) + **חיצים = `Arrows`** (`engine/looks/arrows.ts`, generic vector
arrows; **shaft length follows the vector's length**
— lead: longer for faster waves, then "too small / too similar throughout": barb-sized
(`sizeFactor` 1.1), shaft half-length 12 → 60 of the 128 sprite, full length at the ctor's
`longestAt` (waves: 3 m), eighth-steps, one cached sprite per step × ink). **`GridIcons`** (`engine/base/grid-icons.ts`, lead: arrows and
barbs "are pretty much exactly the same and should share something") owns the shared half —
placement on data cells, sizing, the sprite cache + `release()`, the `IconLayer`; a subclass only
answers `iconAt(eastward, northward, lat)` → `{ key, angle, draw }` + a `sizeFactor`. Placement is
screen-constant like the barbs always were (lead: arrows "should change size on zoom just like
wind barbs"): stride = grid width / 35 (the barbs' old every-2nd-cell on a 70 grid), size capped at
a 35-across slot of the view, so full-resolution grids neither crowd zoomed out nor balloon zoomed
in past the data's cells off. `Quantity.WaveHeight` (m, one decimal —
the Meters format case splits by quantity). Shortcut **ים** (lucideWaves): colours + crests.
Fixture: `fetch-ecmwf.py` also pulls the ECMWF `wave` stream (`swh`, `mwd`), land packed as the
manifest's `missing` sentinel (−32768 → NaN; any missing bilinear corner → NaN).

**Wind barbs look — דגלונים (2026-09-28):** a fourth wind look (off by default), `WindBarbs`
(`engine/looks/wind-barbs.ts`, `LookKind.Icons`'s first use; a `GridIcons` subclass since
2026-09-30) over the particles' `VectorField`.
Lead's placement (flagged against the thin-to-screen convention, he chose it): **barbs sit on the
data's own grid points — every 2nd cell — sized to that 2×2 block**, fitted to the SHORTER on-screen
side (mercator-corrected cell height; sizing by width alone collided vertically on the fixture's
wide-view grid), staff ≈85% of it, glyph centered on the point; size therefore scales with zoom on
real fixed-resolution data (the fixture's 70-cells-per-view grid keeps them ~14 px at any zoom).
Glyph = `windBarbPath` (moved from the parked `skew-t` branch into `utils/wind.ts` beside
`metDirection`, which left `layers/model/wind.ts` because engine may not import layers), always
knots by convention, calm (<5 kt) = a small dot (the double ring read "weird"), feathers flip side
south of the equator; adaptive ink (white / `#212429` on bright basemaps); canvas sprite per 5-kt
step cached until `release()`. Tuning literals inline: stride 2, size factor 1.1 — stride 3 is the
lever for bigger barbs.

**Sounding table v1 — סונדה בדקירה (2026-09-27, lead-named):** "as if someone released a real
radiosonde at that point" — a second item in the point chooser opening a **side drawer on the
map's END edge** (lead loved the slide-in; built first for a Skew-T, which is **parked on branch
`skew-t`** until a professional reviews it — see plan.md). **One shared point for every point
view** (lead picked it over a per-view pin component and a views list, after calling the menu's
`meteogram.point() ?? soundingTable.point()` pin line "too specific"): `PointService`
(`point-menu/point-service.ts`) holds the clicked `point` and the open `view` (`PointView` enum)
— `showView(view, point)` / `movePoint(point)` / `hideView()`. The chooser opens only while no
view is open, a click while one is open moves the point, the pin (in `point-menu/`) shows at
`point()`, and each drawer renders on its own `active = view() === PointView.X`. The views'
services keep no point of their own: the meteogram's requests read the shared point (its charts
only exist while it's active), and the always-mounted sounding table's `request()` returns
undefined unless its view is open. Views are therefore exclusive by the state's shape. Drawer: `<app-sounding-table>` sits `end-0` between top bar and time bar, `w-md`,
solid `bg-card`; its measured width drives `--sounding-table-width` (the `--time-bar-height`
idiom, a HomePage ResizeObserver), which insets the map well, the legend and the perf HUD; opening
animates width (`animate-widen` / `animate-narrow` tokens) around a fixed-width inner so content
never reflows. **Time = the map's `displayTime`**; the drawer keeps the last sounding while the
next loads (`linkedSignal` over `hasValue()`/`isLoading()` — `resource.value()` otherwise resets
to undefined on every request change, the map's keep-the-last-frame rule). **Rows (lead delegated
"emulate a radiosonde every 1k ft"): TRUE geopotential heights every 1,000 ft, as high as the data
goes, above a surface row (terrain icon) — highest on top by default** (lead 2026-09-27, after a
surface-first cut), each interpolated from the wire's pressure
levels by height (`Sounding.levelAtHeight` — linear in height, log-linear in pressure). Columns:
גובה (the m/ft setting — lead: "follow the m ft but show every 1k ft", so rows read 305 m, 610 m…
under meters), לחץ (mb), **תיקון = true height − what a 1013-set altimeter reads there**
(`feetAtPressure(p)`, the D-value: positive means you are higher than indicated), טמפ׳, טל, לחות
(RH from T/Td, `relativeHumidity`), רוח (**an arrow pointing downwind** — lucide arrow rotated by
direction + 180, the meteogram's arrow convention; the degrees ride on its `aria-label` — plus the
speed in the settings unit). An ISA-deviation column was built and removed the same day (lead: "no
need for ISA"; the numeric wind direction also gave way to the arrow at his ask). **Sorting**: the גובה header is a
ghost `hlmBtn` (the shadcn data-table sort idiom) toggling `highestFirst` (session-only, default
highest on top); the table **always starts from the top** (lead: opens at the top row in either order,
and a sort flip scrolls back to the top; time steps keep the reader's scroll position) — a
`flex-col-reverse` open-at-the-surface trick was built first and dropped. **Look (lead-picked over three live-mockup rounds — "a mix of
6 and 8", then option 4 of a column-separation round because "its hard to see the differences
between the columns")**: **every value carries its unit inside the cell** (a small dimmed 10px
suffix; each value is an `inline-flex items-baseline gap-0.5` number/unit pair, so source
whitespace never changes the gap) and **every other column is banded** (`bg-foreground/4` on
לחץ/טמפ׳/לחות, header included); headers are plain names. **לחץ and תיקון are their own
columns** (small muted 11px) — they were folded into the height column as a tiny pressure-over-
correction stack under a `colspan` header for one round (lead picked it from three merge
mockups), then the lead went back to separate columns: "i prefer the older way". Every cell is
`align-baseline`; a `<colgroup>` shrinks the humidity column to fit (`w-px`). **One font weight for
every value** (lead: mixed bold "too much") — hierarchy comes from size/mutedness and the
temperature tint only. Humidity bar is short (`w-5`) (lead: the bar was "too spacious for
what it is"). Temperature carries a SOFT tint
(`color-mix(in oklab, <TEMPERATURE_PALETTE color> 50%, var(--foreground))` via a `--temperature`
CSS var — the map's palette, lightened), dewpoint muted, humidity = a thin sky bar + number, wind =
speed + downwind arrow; faint row lines only (a stronger line every 5,000 ft was built and
removed — lead: "no need for that line"). Rejected in the rounds: saturated
colored text everywhere ("a bit too much"), tinted-cell heatmap, two-line grouped cells (beautiful
but ragged; its hierarchy survived as columns), units only in headers (columns blurred together),
hairline column dividers, and every way of merging לחץ/תיקון into the height column (two-line
cells, one-line slots, the mini stack — the stack shipped briefly, then reverted). **Alignment is measured, not eyeballed** (lead:
"make sure everything is aligned properly before showing it"): every column's content edge equals
its header label's edge (0 px), one baseline per row, bars/arrows in fixed-width slots, icon and bar
centers within 0.5 px of the digits. Landmine: ng-icon's own component CSS sets
`vertical-align: initial` and unlayered component CSS beats Tailwind's layered utilities (the
maplibre-container lesson again) — **aligning an ng-icon needs the important modifier**
(`align-[-0.2em]!`); margins are unaffected. **Units module grew a number/label split** so a table
can style the unit apart from the number: `formatNumber(value, Quantity, from)` (display-unit number, the same
rounding rules), `unitLabel(Quantity)` (the display unit's suffix, reactive to settings),
`formatSignedNumber` (+ for positive deltas); `format` is now `formatNumber` + `unitLabel` joined
tight or spaced per unit (`unitsWrittenTight`) — output byte-identical to before, verified over 120
cases by a temporary check, then deleted. New Units pieces: `Quantity.Pressure`/
`Unit.Millibars` and `Quantity.RelativeHumidity`/`Unit.Percent`. `modelAtPoint(lon, lat)` joined
model-layer (the meteogram's inline copy uses it); `feetAtPressure` is now shared by LevelService
and the fixture. **Wire (ASSUMED — confirm with the backend lead):** `/api/sounding?lat&lon&model&time`
→ `SoundingWrap { time, levels: { pressure, height (geopotential m), temperature, dewpoint, u, v }[] }`
(`types/sounding.ts`)
(surface level first; RH is computed, not sent). Fixture: the air-column routes read the real
ECMWF pressure levels (see the fixture paragraph above; dewpoint derived from t + r).

**Meteogram v1 — מטאוגרמה (2026-09-23, lead-specced in one session; Hebrew name lead-corrected):** not a classic line meteogram — a
**time-height section** per tab: x = time, y = **0–45 kft** (`MeteogramService.topFt`), clicked
point fixed. Flow (lead): a plain map click opens a **chooser menu** at the click (spartan
context-menu opened programmatically — a hidden `[hlmContextMenuTrigger]` span, `open({x,y})`, so
right-click stays native; `pages/home/point-menu/`, one item מטאוגרמה, room for raw values/Skew-T);
picking it drops a **pin** (a `#pin` element declared in the meteogram template — visuals live in templates, lead review — handed to the generic `MapService.showMarker(element, point)`/`hideMarker(element)`; the click seam is
`MapService.clicks`, an RxJS Observable fed by a private `Subject` — **events are Observables, state is signals** (lead 2026-09-24: a signal+effect "event" was rejected in review as unconventional; it replays on re-creation), `PointMenu` subscribes with `takeUntilDestroyed`; maplibre stays in engine/) and opens the sheet; **while open, a map click
moves the point directly** (no menu). **Placement — a drawer rising out of the time bar (lead, 2026-09-24, after ~8 rendered mockup
rounds on the live app):** `<app-meteogram>` is projected (`<ng-content/>`) into the time bar's
**track column**, above the track — so the drawer is exactly the track's width by construction
(chart day lines meet the bar's ticks, the chart's white map-time line continues the handle), it
**never takes the menu column** (lead: "the right side shouldn't expand"; the menu keeps its
`bottom-14.5` and is stacked **after** the time bar in the page so the grown bar never paints
over it — lead caught the menu losing its lower part; the step buttons went `self-end`), and the time chip + loop pill, anchored
`bottom-full` of the column/bar, float above the drawer for free. The time bar itself stays
unchanged underneath (buttons, bands, handle). Opening **rises from the bottom**: `animate-rise` /
`animate-sink` tokens (height keyframes, 0.22 s / 0.18 s) on the fixed-height (`h-72`) drawer;
the drawer is `h-96` (lead: "higher" than the first `h-72`); the map shrinks in step because `--time-bar-height` is measured (ResizeObserver on the time bar)
and drives the map well + legend bottoms. Drawer anatomy (mockup "3 as is", lead-picked): a
**title block** (bold מטאוגרמה over a pin-iconed coordinates line in the settings format), a
divider, **browser-style tabs** with icons (thermometer/wind/cloud) whose active tab is
`bg-secondary` and joins a 2px `secondary` band along the chart's top — the `browser` variant of
our spartan tabs copy (`hlm-tabs-list variant="browser"`, trigger styles keyed off
`group-data-[variant=browser]/tabs-list`; the unused paginated list was dropped from the copy) —
a **legend** (lead 2026-09-24: "reuse the legend data of the original layers") — each tab row
in `Meteogram.tabNames` holds its legend directly (lead review: no lookup through layer looks;
tab names hardcoded too): `gradientLegend(TEMPERATURE_PALETTE | WIND_SPEED_PALETTE, quantity,
unit)`, re-evaluated in a computed so unit switches apply, and the exported `POLYGONS_LEGEND`, shown horizontally in the header's middle (gradient strip + evenly spaced labels, or
swatch dots) — and ✕ at the far end — the legend is **pinned beside ✕** (lead: it must not move between tabs;
it first sat centered in the free space). **One continuous background** (lead: the tab strip may not be a darker
band). The **height axis is a strip** on the chart's end edge (`bg-card/80`, labels every 5k ft) —
labels over the colormap were "not very visible". **Heights are linear** (`ft / topFt`; a
pressure-scaled axis was built for the low clouds and reverted the same day — lead: "consistent
distances"); `MeteogramFrame.topFt` (default 45k) is per tab — **the clouds tab sets it dynamically**
to the tallest event in its data rounded up to 5k (min 10k; lead's idea), and its block text is
10px so thin layers still fit — every block shows the polygons' own `style().text` verbatim
(lines joined; lead review: a chart-side `textOf` re-deriving cover/precip was "too specific" — the
original chip text wins, base–top prime heights included). Arrow rows sit every 30 px of screen height. Rejected along the way: a side
column under the step buttons (cramped), a replacement panel with its own time labels (felt like
a different element — `TimeAxis` extracted then reverted), a floating card (no time alignment),
folder tabs over the map, chip/underline/segmented tab styles, gridline axis. **One zoom (lead: "line them up"):** the time bar's view moved from TimeBar into
a display-state **`TimeBarService`** (`pages/home/time-bar/`, lead review: display helpers do not
belong in the domain `TimeService`, and "timeline" is reserved for a future feature) — `view` (+ `zoomView(anchorFraction, wheelDelta)` / `shiftView(wheelDelta)` and the
keep-displayTime-in-view effect, + `panView(from, spanFraction)` shared by both drags, + `positionInView(time)` / `timeInView(fraction)` — **the one home for view math**, used by the time bar, chart frame, section image and clouds blocks); wheel over
the chart zooms both, shift+wheel pans, **dragging the chart pans the time bar too** (lead; the
track's 4px pending→pan threshold, click-without-move = jump). The chart sits on the time bar's
card color — **no background shift, no past dimming** (lead disliked both; the time bar already
marks past/future). Shared `MeteogramFrame` (`meteogram/meteogram-frame/`, content-projected drawing + an optional `[lanes]` slot under the height area — pan/zoom/jump and the now/map-time lines span it; hovering a lane calls the tab's `hoverText` with **`heightFt = NaN`** — the Units module's "no value" (the chip's height reads —), so the one `(time, heightFt)` contract serves both areas; owns the one `size` signal (the height area's) its children read — `MeteogramColormap` via `inject(MeteogramFrame)`, `CloudsChart` via `viewChild`): emerald now line,
white map-time line, hover **crosshair + chip** (day lines were tried and removed — lead)
(time · height via new `Quantity.Height` = kilofeet prime · the tab's `hoverText(time, heightFt)`
value), **click = `time.jumpTo`** (lead: both hover and jump). **Tabs** (lead: each its own tab,
**loads on request**): `@switch` renders only the open tab's component, but the data lives in
`MeteogramService` (lead 2026-09-28) — one `httpResource` per tab, requested only once that tab
has been opened at this point (`openedTabs`, a `linkedSignal` reset by every point change; closing
the meteogram nulls the point, so all data is released), so switching back is instant and moving
the point refetches only the tab on screen. **Temperature**: interpolated
colormap canvas (`meteogram-colormap/`: per-pixel `MeteogramData.valueAt` → the map's `TEMPERATURE_PALETTE`,
rendered at 0.5 resolution and CSS-upscaled, colors cached per 0.1 value step — d3's per-pixel
string parse cost 30 ms/draw, cached ≈5 ms) — **palette
extended to −60 °C for map and meteogram** (lead: "both"; stand-in stops −45 `#a21caf`, −60
`#f5d0fe`; aloft reaches ~−65 °C). **Wind**: speed colormap (`WIND_SPEED_PALETTE`, `hypot`
section) + arrows pointing downwind drawn by **`WindChart` itself** on its own dpr-true canvas
projected into the frame (lead review: arrows are wind-specific, so they stay out of the shared
`MeteogramColormap`, which is colormap + contour lines only) — **anchored to the data's own hours** (local-clock multiples of a
1/3/6/12/24 h step picked so arrows sit ≥ 40 px apart, rows every 5,000 ft), so they travel with
pan/zoom and thin out when zoomed out (lead: screen-fixed arrows that "don't move" on zoom were
wrong; the first cut's 288 DOM icons with drop-shadow filters also made the tab "super laggy");
**contours like the old app**, declared per tab as a `MeteogramContours` config (field named
`contours` in both tabs — lead: not isotachs/isotherms)
(`{ faintStep, marked: { level, color }[] }`) that `MeteogramColormap` traces itself — wind: (lead's photo of the old wind section, 2026-09-24): faint dark lines
every 1 m/s plus two **marked isotachs — white 25 kt and gray 45 kt** — values inferred by
sampling the photo's pixels against its own color legend (gray ±1 kt, white ±3 kt; confirm with
the old app's config), authored in knots and converted through the new
`convertBetween(value, from, to)` in the Units module (`convert` now delegates to it) so they
stay physical when the display unit is m/s (display-unit literals are the map isotachs' known
caveat). Traced once per data load by the house tracer (`contourLines(data, width, height,
bounds, levels)` — plain positional args, lead rejected a named `ContourField` type as too
specific; `MeteogramColormap` passes the section's data with (time, height) bounds whose "north" is
the lowest height, since the tracer maps row 0 to bounds[3]) and only re-projected on zoom,
drawn on `MeteogramColormap`'s overlay canvas under the arrows (~2 ms per redraw). Temperature (lead: "the isotherms and everything there too"): faint isotherms every 5 °C
(the map's spacing) + a marked white 0 °C freezing line; **direction is always computed from interpolated u/v at the sample** (`metDirection`,
extracted from wind.ts) — never interpolate an angle field (wrap at 360° → garbage). **Clouds**
(the polygons' events at the point) — **deliberately flat (lead: "the cloud tab can be
simplified")**: one block per event at its real base–top, identical consecutive frames merged,
filled with the polygons' own `EVENT_APPEARANCES[type].style().fill` (map-identical color and
cover-opacity) — **no hatch patterns, no label backgrounds, no outlines/rain stripes, no collision
placement** (all built, all cut); the style's text rides the block as plain white shadowed text
**only when it fits** the block (measured width, ≥ 11 px tall) — zoom in to read thin layers,
hover lists the clouds under the cursor (over the lanes: the fog/haze in force at that time). **Fog/haze ride lanes, not heights** (lead: no invented
heights — they have none on the wire): one 16 px row per kind present in the data, under the
height area, time-aligned blocks in the map color with the visibility band as text, labeled in
the strip column by the new **`EventAppearance.name(event)`** (ערפל / אובך קרקעי / אובך גבוה —
also the head of each kind's `hoverText`, one source); lanes sort by name, so kinds absent from
the range take no space; the height axis holds clouds only. **Data (ASSUMED — confirm with the backend lead):**
`/api/meteogram?parameter&lat&lon&model&start&end` → `MeteogramWrap { times, heights, values[height][time] }`
→ `MeteogramData` (`objects/meteogram-data.ts`: fractional-index bilinear via `utils/interpolation.ts`, which
Grid now shares); `/api/polygons/point?lat&lon&start&end` → `PointForecast[]
{ startTime, endTime, forecastEvents }` — **the backend resolves the sector** from the point
(lead: the frontend declares no sector for point queries); outside every sector → empty →
אין תופעות. Range = the temperature layer's own 24/96 window around the hour-floored
now; model local/wide by `contains(LOCAL_COVERAGE, point)` (exported from model-layer). Fixture:
the air column reads the same real ECMWF files as the map;
`syntheticPointForecasts` point-in-polygons the sector scenes. spartan **tabs** + **context-menu**
vendored (tabs' helm selectors translated to brain 1.0.4's `data-state`/`data-orientation`, the
switch precedent). Rejected same session: Zulu/Local (local only), level persistence, per-knob
quality settings (a single low-quality toggle instead — plan row).

**Settings panel v1 (2026-08-26, lead-iterated to rest):** a gear button in the top bar opens a
frosted popover (the floating-window recipe, `align="end"` — a centered popover overflows at the
corner) with one יחידות list: **רוח kt/m·s⁻¹**, **גובה גיאופוטנציאלי m/ft**, and **קואורדינטות
כבוי/DD/DMS** — the coordinates surface moved here WHOLLY (the crosshair top-bar button + its
menu are deleted; כבוי hides the layer, picking a format shows it + sets it; the format control
moved OFF the Coordinates layer, which is now pure hover machinery). **The settings' home is
`pages/home/settings-panel/settings-controls.ts`** — control definitions (plain `options()`
Controls, Table presentation) + their `registerSettings` calls co-located (lead settled here
after a full exploration: definitions inside `settings-panel.ts` itself CRASH BOOT — units.ts is
imported by every layer, the component file imports the registry which constructs every layer,
and the resulting import cycle re-enters class definitions mid-load → "Class extends value
undefined"; the sibling file stays import-light on purpose. `utils/settings.ts` stays pure
machinery with `registerSettings` now exported). **Units machinery**: `displayUnitOf(quantity)`
= `unitControls[q]?.() ?? displayUnit[q]` — the hard-coded record is the fallback, call sites
untouched as the module always promised; m↔ft conversion added; the `Unit.Feet` format case
splits by quantity (Altitude keeps רגל מעפ״י, geopotential reads "ft"). **Legends went
signals-first for reactivity**: Colormap's derived legend is a `computed` (palette+label
re-evaluate on unit switch; an explicit `options.legend` stays a static signal), and
`ObservationParameter.legend` became `Signal<Legend>` (wind = `computed`, fixed-unit params =
`signal(...)`). Unit switches re-render hover/legends/labels live through the provider/draw
reactive chain. Fixed-by-lead: temp/visibility/rain/direction/altitude/cloud-base stay
single-unit. Zulu/Local was dropped 2026-09-23 (lead: local only, no toggle — the recorded
`14:00Z` spec is void). Caveats standing: isotach levels stay
kt-authored and geopotential's 20 m contour spacing shows non-round ft numbers (both wait for
the switchable-conventions rework); perf + gear buttons carry no tooltips (a corner button's
bottom tooltip falls back sideways across its neighbors — the palette keeps its). Adding a
future setting = one `options()` entry in settings-controls.ts; the panel renders the list.

**Hover readout + minimal Units + perf HUD (2026-07-06, lead-verified; Units API reshaped
2026-07-08; moved to `utils/units.ts` 2026-07-14):** the Units module is quantity-based, windy's settings screen as the model: callers
state what a value is and which unit it's in — `convert(value, Quantity, from)` /
`format(value, Quantity, from)` — and the module resolves the display unit via its `displayUnit`
record (hard-coded °C/kt/met° today; the future per-quantity settings UI plugs in there with zero
call-site changes). `NaN` → `—`. Conversions stay a hand-rolled factor table — generic libs
(convert-units, js-quantities) don't cover Beaufort/dBZ/kilofeet/met-degrees. Each layer implements
`Layer.hover(grids, lon, lat)` (temperature: bilinear °C; wind: u/v-interpolated speed +
met-degrees "from" direction — vector-aware by construction); a cursor-following readout chip lives
in `pages/home/hover-readout/` (hides off-map and over panels). `dev/perf-hud/` ships with the app
(§8): Ctrl+Alt+P or `?hud=1`, FPS + JS heap, rAF loop cancelled on toggle-off and destroy.

**Polygons layer (2026-07-16 v1, 2026-07-19 event-kind split; "polygons" is the feature's name —
warnings is a different, future feature):** first non-model layer kind. `PolygonsLayer extends
Layer<PolygonMap>` lives beside its event kinds in `layers/polygons/polygons-layer.ts` (suffix
only because the bare `Polygons` name belongs to the look class, which matches its LookKind like
Colormap/Contours; moved out of base/ 2026-07-20 — machinery-of-one, a base extraction waits for a
second polygon-map kind, and each kind's machinery now sits in its own folder — ModelLayer moved
into `model/` the same day). It imports `EVENT_KINDS`/`SECTORS` directly; the registry constructs
a bare `new PolygonsLayer()`. **The real event model (lead, 2026-07-19) — one file per kind in
`layers/polygons/`**, each implementing `EventKind<E>` (`style(event): AreaStyle` +
`hoverText(event)`; styles are **functions of the event's values**): **cloud** (one event; base
determines level — <7,000 ft נמוכה dark-gray #535353/opacity 0.5–0.95 by `eights` (the wire's
spelling), <20,000 ft בינונית blue #2748a5/0.3–0.8, else גבוהה #206ea3/vertical lines/0.3–0.8) which
**recursively nests precip** (`precip.ts`: outline sampled continuously from the old app's 5-stop
pink→maroon ramp by severity=(level−1)/3, width 3→8 px, navy #001d59 text outline w8 — overrides
the default thin-white separation outline every polygon gets) which **nests CB** (`cb.ts`: cbType
scattered/cb/cloudy → fill #ff0000/#c30000/#800000 at the cloud's alpha, border = its fill color
at width 4→8 by severity 0–1, black text outline); **haze** (surface orange #ff9800 0.5–0.95,
high yellow #ffe33f 0.1–0.5) and **fog** (#535353, grid pattern) — both carry `minVis`/`maxVis`
matched against the shared `VISIBILITY_BANDS` table (`layers/polygons/visibility.ts`; worse band →
more opaque; bands are invented stand-ins). **Label placement (2026-07-20, simplified per lead — simple behavior over cleverness):** each
chip homes on its polygon's **center of mass** (polylabel's pole of inaccessibility when that
falls outside a concave ring); a **zoom-aware** relaxation then spreads only **text-vs-text**
clashes in true pixel sizes (+6px padding) — **zoom flows like time/bbox**: `Inputs` gained
`zoom()` (backed by `MapService.settledZoom`, set on moveend), the polygons layer stashes its
`Inputs` in `fetch` and its provider writes `zoom` into `PolygonsInput`, so looks stay pure
functions of their input (`deckLayer(id, input)`, no engine context param) and the provider's
signal read relays out precisely on settled zoom changes — and chips **never leave their
polygon**: after each pass, any anchor
that crossed its ring is bisected back along the line to its interior home (far-out zoom accepts
residual overlap rather than escaping the polygon). Palette/ranges extracted from
photos of the old app's `polygon-styles.ts` (2026-07-19; its NEW preset — an OLD preset also
exists there, and TURBULENCE #800080 + EDITING types await future support). Every polygon shows a **minimal text chip as an event-colored pill** (canvas sprite: background =
the polygon's fill color, no border, luminance-picked text — the chip *is* the polygon's
identity; placement per the label-placement paragraph below — never hidden):
clouds show eights/8, base-top in thousands of ft with a prime (3'-5' = 3000–5000 ft), precip
probability %; haze/fog show their visibility band (e.g. 5-10 km). Paint order is code-controlled
(`PolygonsLayer.order` field, no UI): by height (ground-most on top; high haze slots at 20,000 ft)
or by event type (clouds < haze < fog); height is the default.
The layer file also holds the `EVENT_APPEARANCES` record (each kind implements
`EventAppearance<E>` — the old app's own vocabulary) + `SECTORS` (sector squares bound to the
`Sector` enum — center/north so far, hard-coded for now, later possibly a separate backend
request; the fixture imports the same record and shifts its authored scene into the requested
sector's square). The
layer's **sector is a persisted options control** (Table presentation, always visible while the
layer is active; the fetch and provider read the signal, so switching refetches and moves the
frame). Wire contract `PolygonsWrap` (`types/polygons.ts`): `{ startTime, endTime, sector,
polygons: [{ coordinates: [lat,lon][], forecastEvents }] }` — top-level union cloud/haze/fog,
precip/CB nested inside cloud.
`PolygonMap` (`objects/`) converts `[lat,lon]`→`[lon,lat]` on receive and clips rings to the
sector square — **Turf.js adopted here** (`@turf/bbox-clip`, `@turf/boolean-point-in-polygon`,
`@turf/helpers`; the look also uses `@turf/buffer`, `@turf/center-of-mass`, and Mapbox's
`polylabel` — label layout runs per settled zoom, so per-call GeoJSON allocation is fine there,
unlike hot loops). The `Polygons` look renders fills and outlines as **separate layers** (so
outlines draw above the hatch) + an
**inner rim band** per polygon (`@turf/buffer` −2 km inset stroked in the fill color,
drawn **above all fills/hatch/frame** so every rim stays readable under stacks — lead 2026-07-20)
+ the sector frame + **pattern
hatching computed geometrically** (`PolygonPattern` solid/horizontal/vertical/grid; evenly spaced
lines clipped to each polygon at 0.12° spacing → one `PathLayer`; deck's FillStyleExtension was
tried and reverted — a hidden-pane repaint stall framed it, it's likely innocent, but geometric
hatching is extension-free, integrated-GPU-cheap, and looks like a classic synoptic chart). A
polygon with several events **draws once per event** — stacked patterns tell them apart; hover
lists one line per event (readout spans: `dir="auto"` + `whitespace-pre-line`). `timeWindow` = 0
back / 96 forward / 3h. Fixture: `/api/polygons` synthesized per (sector, 3h frame) — four kinds,
overlapping areas, a multi-event storm, one polygon poking outside the square to prove clipping.
**Startup shows the polygons layer instead of the weather shortcut (lead, 2026-07-16 — he uses it
constantly).** Deferred (plan.md): sector picker, on-map per-type text, icon patterns, stale-map
linger when scrubbed outside coverage.

**Contours look (2026-07-08, lead-verified):** `utils/contours.ts` traces labeled isolines from a
`Grid`: NaN-aware 3×3 blur ×2 (kills staircases from value quantization — real backend data rounds
too) → **`@turf/isolines`** (2026-09-29, lead: the hand-rolled tracer was "over engineered"; it
replaced ~140 lines of 3× upsample + marching squares + segment stitching; Turf is already the geo
library, pinned to our 7.3.5) → `splitAtGaps` cuts lines at NaN cells (Turf routes around gaps as
if they were low values — the meteogram's section has NaN rows below/above the model levels) →
Chaikin ×3 (was ×2 — lead: lines looked "stiff" on tight curves). The grid is fed to Turf in index space (`point([col, row])`) and mapped to lon/lat
after, so the gap check stays a plain index lookup. Verified: open at grid edges, closed rings,
~20 ms per SLP redraw (was ~30). d3-contour stays rejected (closed polygons incl. border frames). `engine/looks/contours.ts` renders two `PathLayer`s (a
3.5 px dark casing at alpha 200 under a 1.5 px opaque colored core — 2026-09-29: thinned from 4/2 px
("too busy" on the 2 mb SLP map), then a 2.5/1.25 px faint-casing step proved unreadable over the
temperature colormap, settling here) plus label sprites: each unique level text is canvas-rendered
once as **bold 12 px numbers in the look's color mixed halfway to white (`interpolateRgb(color,
'#ffffff')(0.5)` — lead: brighter for contrast, hue kept) with a thick (4 px) opaque dark halo** (the old
tool's style — lead picked it over the former stadium pills, a dark chip, and white numbers, which
read best but got confused with other layers' outlines; cached per look) and drawn via `IconLayer` at fixed pixel size, rotated to the line's local direction
(mercator-corrected, never upside down). **Placement is screen-relative** (the grid's bounds ≈ the
view, since model grids are bbox-windowed) and deliberately plain (simplified 2026-09-29 with the
Turf swap): walk each line, a candidate every 5% of the view width; take it if it is ≥ half a view
width past this line's previous label and ≥ 5% of the view width from every placed label — so
every line gets a label wherever a free spot exists and **stays unlabeled if every spot is taken**
(lead: labels on all lines, never overlapping). The former flattest-stretch scoring (tilt + bend)
was dropped: labels may now sit steep or on a bend — the accepted price of ~60 fewer lines. Constructor `(provider, LevelPicker, label, color)` — **every contour label carries its unit
through the Units module** (lead 2026-09-30: "units are important to differentiate" — "20°C",
"1016mb", "120 m", "30 kt", "70%"; never `String`) — each contour set
carries a fixed identity color (lead 2026-07-08, the classic-synoptic model; simultaneous sets are
told apart by color, never made exclusive): temperature adds rose isotherms via `levelsEvery(5)`,
wind adds violet isotachs via a fixed kt array (provider converts m/s→kt through the Units module —
note: level sets are display-unit literals, revisit with switchable conventions). `Look.deckLayer()` may now return
`DeckLayer[]`. Two engine-wide fixes rode along: maplibre's context gets
`canvasContextAttributes: { antialias: true }` (interleaved deck draws into it; without MSAA all
deck geometry is aliased — flagged: extra GPU cost on integrated GPUs, quality-knob candidate), and
`MapService.init` awaits `document.fonts.ready` (font atlases/canvas sprites must never bake a
fallback font). A pressure/isobar layer was built then descoped to keep focus on the look —
re-adding it is one file + a registry entry (plan.md filler row).

**Geo module v1 (2026-07-23):** coordinate formatting joined `utils/geo.ts` (already the
mercator/bounds home): pure `formatCoordinates(lon, lat, CoordinateFormat)` — decimal (lat-first)
and DMS (seconds-carry math). MGRS and its `mgrs` package were built then removed same day (lead:
"no need right now" — restoring is one enum member + one case + the dep, noted on the plan's MGRS
row). The readout is a **layer** (lead's call): `Coordinates` in `layers/general/` — no looks,
`timeWindow: null` (the base field went nullable; timeless layers contribute no window,
`syncTimeWindows` filters), `fetch()` returns `signal(null)`, and `hover` formats the cursor
through its persisted format control (DD/DMS Select, `settings.coordinates.format`) — so the
chip line and the picker fall out of existing machinery; value chips became
`min-w-9` so long labels don't overflow. **Moved out of the layer card 2026-08-19** (lead: "its
location is the issue not the layer itself"): a crosshair icon button in the top bar (pressed
while active) opens a כבוי/DD/DMS radio menu — off deactivates, picking a format activates + sets
it; the mechanism is the registry's **`menuLayers`** list (the card renders exactly it, in its
order — coordinates is registered but not listed; a `Layer.inMenu` flag was built and rejected
the same day, lead: "a layer should absolutely not know if its on the menu" — presentation
groupings live in the registry beside `shortcuts`, never on layers), so the layer, its settings
key, and the hover line are untouched. Startup shows it alongside the polygons layer (lead
2026-07-23). Typed-coordinate parsing waits for its first consumer (search/fly-to).

**Borders above weather (2026-07-28, lead-verified):** the basemap's country borders, a new
`coastline` layer (ocean-kind water outlines), and an `israel_outline` geojson layer draw **above**
colormap/image looks in **bold black** (width 2): `LookKind.Borders` is the seam — `Overlay.apply`
clones looks ranked below Borders with `beforeId: 'coastline'` (deck 9 layer-groups; the enum
insert shifted numeric values only — settings keys use enum names). The three style JSONs carry the
black block at the top of the stack; districts (`boundaries`) stay untouched mid-stack, labels stay
below weather (lead: only borders above). Borders + coastline render from a **`protomaps_coarse`
source clone with `maxzoom: 5`** — one frozen geometry at every zoom (kills the Suez-canal pop-in
and all per-zoom line changes; lead: no inconsistencies, low resolution is fine).
`boundaries_country` filters `disputed: true`; **`public/basemaps/israel.geojson`** (loaded via a
geojson-source URL rewrite in `loadBasemapStyle`) supplies the political envelope instead:
Gaza–Israel, Israel–Lebanon, trimmed Lebanon–Syria (z7 tile extractions), and the **Golan +
2024-25 control-zone arc pixel-traced from the lead's reference image**
(`docs/israel-control-zone-reference.png` → blue-mask contour trace → RDP → georeferenced by
auto-calibrating on the Kinneret's pixel bbox) — WB/Golan/the July-2026 IDF-held zone read as
inside Israel, inner seams (Green Line, 1974 lines) undrawn; the WB valley + Yarmouk stay
tile-drawn (z5-normal), vendored duplicates removed after they braided. Flags: black borders
near-invisible on the dark basemap when no colormap is shown (per-style color is a one-line
change); z5-tile↔vendored junctions can sit 1-2 px apart at sector zooms.

**Satellite loop v2 (2026-08-06, the animation retry landed; design + full history in
[`docs/satellite.md`](docs/satellite.md)):** the lead-picked "service-side pick" design — the
playhead never enters layer/look/Inputs code. `LoopPlayer` (`services/`) is the loop-only handler
— **constant-velocity sweep since 2026-08-18 (lead: "the most sparse layer chooses the pace")**:
an rAF loop (running only while loop layers are active — `setTimes` play/pauses it, the idle
app schedules zero wake-ups) advances a continuous `loopTime` so one frame-interval of the sparsest active loop
layer (max over layers of their list's smallest gap) takes `frameMs` (400 ms, lead-tuned from 500) of wall time; every
layer's `atTime` nearest-picks from the raw sweep, so each flips **evenly** at its proportional
pace (sim-verified 150/250/500 ms exact — the old 500 ms-per-merged-stop tick gave every union
stop equal wall time regardless of data span, so a satellite picture held 2 ticks or 4 depending
on how many radar stops fell inside it, the inconsistency the lead called out; a snapped-then-
re-nearest variant was tried in sim and rejected — double quantization wobbled the pace layer
283/550/483). `nearestFrameTime` derives as nearest merged time and is what the chip shows (real
frame times only, lead-picked); layers read the raw sweep, which updates per rAF — loop-layer
computeds re-run ~60/s: cheap shallow re-picks (frames/bitmaps shared by reference; the fresh
identity per rAF is what drives redraws) absorbed by deck prop-diffing + the raster memos. A
`LoopLayer.sameData(a, b)` equal on the playLoop computed (holds identity between real flips so
draw effects fire only on actual frame changes) was **built, verified, and reverted 2026-08-19**
— the win was unmeasurable (120 fps both ways, sub-ms/frame of CPU JS) against a permanent
contract obligation with a footgun (a lazy `true` freezes the loop, a lazy `false` is silent
churn); the recipe stands here as the ready re-add if the perf HUD on a real mini-PC ever points
at playhead churn: abstract `sameData` reference-comparing frames+shown per layer, passed as the
computed's `equal` with null-guards. Newest-hold = `restartDelayMs` 1500ms (converted to data-time overshoot past the newest frame — the sweep coasts, consumers nearest-pick, no hold accumulator). **Loop player controls (2026-08-19, lead: "very important")**: a floating frosted pill
(card recipe, `dir=ltr`) **centered above the time bar** (lead 2026-08-23, was end side; lifted
`mb-17` so the handle's readout chip passes under it at any position), visible only while `loopTime` is non-null
— ⏮ ⏸/▶ ⏭ (lucide) + a ×N **cycle chip** ×0.5/×1/×2/×4 (an in-strip block was tried first —
lead: too cramped — and a popover speed slider — lead: cycle icon instead). `LoopPlayer.playing`
+ `speed` signals (speed scales frameMs; the hold stays 1500ms wall at any speed; session-only),
public `play()`/`pause()`/`stepFrame(±1)` over private `run()`/`halt()`; `stepFrame` auto-pauses
and walks the merged times list with wraparound; `setTimes` respects a user pause while loops
live, but the pause **dies with the loop session** (empty setTimes resets playing — pausing then
re-showing a loop layer plays, the lead's bug). Perf HUD sits **top-left** since 2026-08-23
(`end-3 top-15`, lead's arrangement round; it had chased the pill through `bottom-18`→`bottom-28`). The timeline view boots **centered on now** (lead's ask — `paddedWindow` centers
the window's span on `time.now()`, handle at 50%). Caveat: a multi-site layer merges its sites' times before the
player sees them (3&10-min sites → phantom 1-min union gaps understate its cadence) — harmless
while a sparser layer is active; per-site lists are the fix if a radar-alone loop ever paces
wrong. Lead floated a priority-list-of-kinds alternative to the sparsest rule (plan.md row); `LoopLayer<D>` (`layers/base/`) is the kind marker (`loopTimesOf(data)`
+ `atTime(data, loopTime)`); `LayersService` wires by instanceof — a `syncLoops` effect collects each active loop's raw times
(the player merges: flatten/dedupe/sort is loop-domain logic, lead 2026-08-06), and `showLayer`
wraps loop layers' gated data with
`computed(() => atTime(data(), loopTime()))`, symmetric with `keepIfRelevant`. The chip grew
its second line back: `זמן תמונה · HH:mm` from `loopTime` (wrapper `bottom-full mb-3`, grows
upward). **One moment, two views** (lead renamed the tangled currentTime/targetTime pair
2026-08-06): **`TimeService.exactTime`** is the source of truth (a linkedSignal: raw `now` while
live, the held pick otherwise) and **`displayTime`** derives as `snapJump(exactTime)` — a linear
chain, not two live-branches. Imagery asks + the relevance gate read exactTime (they can never
diverge); model asks, jumps, and the chip read displayTime; `Inputs` = bbox / displayTime /
exactTime / window / zoom. **Per-layer draw effects**: the global draw effect
became one effect per activation in the `layerInjector` — playhead flips redraw only loop layers
(wind would otherwise visibly reset twice a second). Satellite: `SatelliteLoop { frames, shown,
bounds }`, all window frames fetched (`Promise.all`, explicit-field `equal` dedupe),
`shown` re-picked by `atTime`, provider maps `loop.shown` → the untouched generic `Image` look;
hover reads the SHOWN frame's `grays` (the newest-frame hover flag is dead). RAM rule (lead
2026-08-06): frames keep only the display bitmap + a 1-byte-per-pixel gray channel, and only for
IR (`grays?` absent on צבעוני — full RGBA originals cost ~144 MB on a wide loop). While live the loop freshens
each minute (exactTime ticks); scrubbed it plays the 30 min before the selected time. Wind's
`AnimatedLayer` untouched — loops and particle animation are deliberately separate kinds. Radar =
extend `LoopLayer`, implement the two methods; sync across loops is automatic (one playhead over
merged times).

**Radar layer v1 (2026-08-10, uncommitted):** second loop kind, proving the LoopLayer contract —
`RadarLayer extends LoopLayer<RadarLoop[]>` (`layers/radar/`; `RadarLoop = { frames, shown }` is
ONE radar's playing loop — symmetric with `SatelliteLoop`; the layer's data is plainly the list of
them, `loopsOf(flatFrames)` regroups the shared FrameLoader's flat stream, lead-driven renaming
2026-08-13 after `RadarFrames[]`-vs-`RadarFrame[]` proved unreadable). Wire (lead): `/api/radar/times?start&end`
→ **a times list per available radar** (`RadarTimes[]`; the radars ARE the answer, no picker, no
configuration/bounds asks — radar maps are **`Wrap`s of rain amounts** (mm/h), self-georeferenced,
`Grid.fromWrap` reused). All radars display at once; `atTime` picks each radar's nearest frame to
the shared playhead (sync automatic). **Colormap generalized instead of a bespoke look** (lead
2026-08-12): `Colormap(provider, palette: Palette { stops, style }, label, options)` where
`ColormapOptions = { opacity?, interpolation? ('bilinear'|'nearest'), filterValue? (predicate —
values failing it render transparent, his call: a function, not a threshold; named hasValue until
2026-08-18, "hasvalue is weird"), blur?
(canvas-filter feather; named roundedEdges until 2026-08-18 — the lead asked for a name that says
what it does — and hand-rolled as a ~60-line premultiplied box blur until the same day, replaced
by ~8 lines of OffscreenCanvas ctx.filter='blur(2px)', Gaussian look verified equivalent),
legend? (override) }` — defaults keep temperature/wind
byte-identical. **`Radar` (`engine/looks/radar.ts`) is a thin Colormap subclass**: overrides
`kind = LookKind.Radar` (between Colormap and Borders — above model colors, under black borders,
exempt from colormap exclusivity; kind belongs to class identity, never an option — lead) and
draws the coverage rings inside `deckLayer`, toggleable via a **עיגול** control (a boolean `toggle()` switch since 2026-08-19; a מוצג/מוסתר
options-cycle before that, named טווח until 2026-08-18 — lead wants plain-written words over
jargon, his picks) — circles die with the look, "circles without colors" impossible by construction. The N
**Plurality lives on Radar, not Colormap** (lead 2026-08-18, fourth iteration of the day —
`Grid.merge` (union-at-finest-cell) → per-site beaten-cell clearing (value-space max, built,
verified seamless) → plain stacked maps ("all the max value calculations are causing this to be
way too complicated for no reason" — overlap is uncommon, the top map reads clearly over the
bottom, hover reports the true max over covering sites regardless of paint) → finally his "why
does Colormap carry Grid[] at all?": **`Colormap extends Look<Grid>`** — single input, single
`last` memo, model providers return a bare grid — and **`Radar` is a standalone `Look<Grid[]>`**,
no longer a Colormap subclass (input types differ): it owns its palette/legend/opacity/עיגול
wiring and composes the shared **`buildImage(grid, scale, interpolation, filterValue,
blur)`** module function (the pixel loop + the blur feather, exported from `colormap.ts`
— plain positional args and a plain verb+noun name: a RasterStyle params-bag, `rasterize`
(graphics jargon), and `imageOf` (the -Of accessor pattern belongs to cheap data reads, not
builders) were all rejected the same day, lead-picked `buildImage`; nothing outside the two look files depended on
the Colormap class — exclusivity and registry go through `LookKind`). Radar renders one
BitmapLayer per grid, plain — no compositing; per-grid `Map` memo keyed on identity alone, so a
site flip re-rasters only itself, zero coupling between sites (the merge-cost concern that
started the redesign); the Map swaps per render so departed grids drop, `release()` clears it.
Accepted flags: in overlap a strong echo can sit under a weak one (z-order = list order, not
severity — hover compensates) and the top circle's blur-feathered rim fades as a faint arc across
the bottom map. Providers stay pure (`radar: loop.radars.map(site => site.shown.map)`, rings =
`grids.map(grid => grid.bounds)`), no side channels.
`blur` stays layer-overridable through Radar's ctor options; the echo floor is a
`minimumValue` ctor param (lead 2026-08-18: the layer owns the number — RadarLayer's
`minimumRain = 0.1` field feeds both the look's filterValue and the hover's — cutoff, one source;
the look's default is `-Infinity`, a default that doesn't filter). Bands
0.1/1/4/8 mm/h stepped blue→green→yellow→red (invented stand-ins), swatches legend, 0.85 opacity.
Hover = max over covering radars' nearest values → `Quantity.Rain` (new, mm/h) through Units. Ask idiom =
satellite's (last 30 min before `exactTime`, ±30 min relevance pads, `timeWindow { 24, 0, 1h }`).
Radar coverage is a **circle in degree space** (lead 2026-08-10: "same lat lon coverage") —
values never exist outside the inscribed circle of the square bounds; the look draws a subtle
1.5px **coverage ring** per radar (72-segment, equal lat/lon radii from the bounds — renders
slightly tall on mercator, that's the projection, not a bug) and the fixture masks cells outside
the circle to null. Fixture (**rewritten 2026-08-18, lead: "follow the cloud for rain"**): rain
is **sampled from the near-sector satellite frames themselves** — `synthetic-radar.ts` imports
`SATELLITE_SECTORS`, loads the same `near-*.jpg` files at 512px into per-frame cloudiness maps
(`min(r,g,b)` — whiteness beats luminance: desert is bright but blue-poor), and **subtracts the
still ground**: background = per-pixel min across the 5 frames, dilated 1px (registration jitter
flickers hard shoreline edges), baked into the maps at load. Only what MOVES between frames rains
(the lead's own test: "look as it doesnt move" — sun-brightening drift and the bright rift/Dead
Sea ground cancel to ≤0.05, real streets swing 0.16–0.44); rain = `((signal−0.06)/0.3)^1.5 · 9`
mm/h, 3×3-smoothed, so echo is a coherent band under the visible cloud street, mostly blue/green
with rare cores. Frame content maps **monotonically into a vendored 3-hour real sequence** (lead
2026-08-20: "i dont want the clouds to go back" — with 5 frames every pure time-mapping cycles,
and every cycling variant moved backward somewhere: `% 5` rewound 40 min mid-loop, ping-pong
reversed, a crossfade-closed cycle still returned, and a ground/cloud-decomposition drift
construction wobbled since the real frames are only ~half pure-drift; full saga in
docs/satellite.md): 19 GeoColor frames per sector at the real 10-min cadence (2026-08-17
07:00–10:00Z, fetched by `tools/fetch-satellite.mjs`; near asks back at 5-min steps, wide 15 —
in-between frames are **forward temporal interpolation**: `sourceMixAt` returns the continuous
sequence position's floor/ceil pair + mix, satellite blends via `globalAlpha`, radar lerps
cloudiness — monotonic by construction, lead asked for the 5-min feel back);
`sourceIndexAt` = app-load-anchored `round((time − SEQUENCE_EPOCH)/step)` clamped into the
sequence — ~2h history, ~1h live headroom, strictly forward inside any sweep (the loop restart
replays the window, as loops do); sessions past the headroom freeze the newest frame (re-vendor
or restart). Radar builds its cloudiness maps over all 19 frames (deeper still-ground min) and
samples the same mapping's frame, rounded to the nearest slot (with floor-baking the rain
visibly trailed the cloud, lead caught that). Kills three rejected generations: the vendored
RainViewer decode silently blanked the layer (canvas premultiplication guts color below ~alpha
100; the alpha≥200 gate kept 0.5% of echo), the alpha-only rewrite painted an everywhere-storm
("absolutely not real"), and raw whiteness rained on bright ground. The two sites keep their
**deliberately different cadences** (lead 2026-08-10, sync stress test: center every 3 min, north
every 10 — the merged playhead walks the union while each radar shows its own nearest frame);
routes `/api/radar/times` + `/api/radar`. Startup shows radar too (lead's own edit).
The RainViewer tiles (`public/fixtures/radar/`) and satellite v1's `mideast_truecolor.png` are
deleted (lead 2026-08-18) — the radar fixture reads only the vendored `near-*.jpg` frames.
**Fixture imagery is vendored** (lead 2026-08-13, "load once pictures" — runtime EUMETView fetches
broke the app during their outage): `public/fixtures/satellite/` holds 5 same-hour GeoColor frames
per sector (2026-08-07 09:00–09:40Z — daylit, marine cloud streets over the eastern Med) and
`public/fixtures/radar/` 5 real RainViewer composite tiles; the fixtures fetch only these local
files, zero external requests at runtime. **Frames stream in as they load** (lead 2026-08-13, both
loop layers): `resource({ stream })` + a per-activation frame cache — first paint doesn't wait for
the slowest image, window slides fetch only NEW times (previously every live tick re-fetched the
whole window), failed frames evict and retry; the cache key is the request itself: each request entry carries
ONE params `Record`, `load` sends it to HttpClient verbatim and `FrameLoader` keys on it privately
(JSON.stringify inside the loader — lead 2026-08-18: summoning HttpParams just to mint a key
string "is too much"; a hand-invented `|` key format was rejected 2026-08-13 the same way); the publish gates distinguish empty-while-loading
(undefined, via the times/hours resources) from empty-window (null).

**Observations layer v1 (2026-08-20):** third loop kind — `ObservationsLayer extends
LoopLayer<ObservationsLoop>` (`layers/observations/`; `{ frames, shown }`, frames =
`{ time, points: ObservationPoint[] }`, wire `{ lat, lon, value }[]` per parameter — the lead's
fixture shape, no station identity). **One layer, one parameter at a time** (lead): a פרמטר
Table control (טמפרטורה/רוח) — the fetch re-asks and the look re-renders on switch. Time model
(lead 2026-08-20): obs arrive every 10 min; **jumps stay hourly** (`timeWindow { 24, 0, 1h }`)
showing latest values, but **the loop plays 10-min frames** — ask = the 10-min-aligned
`requestTimes` (lead's name, was "marks") — `requestParams`/`obsRequest` privates since the
2026-08-23 split ("obs" is lead-accepted shorthand, flagged against §6 and kept) — in the hour
before `exactTime` (client-generated grid, `askMinutes 60` / `stepMinutes 10` fields; ask-by-time
contract `/api/observations?parameter&time` — **assumed, confirm with backend lead**), each frame
carrying the latest-known value per point (server-side semantic; a station that reports hourly
holds through six frames). Being the sparsest active loop layer, obs set the loop pace (10 min
per beat, verified). Rendering: the generic **`Labels` look** (`engine/looks/labels.ts`,
`LookKind.Text`'s first use) — canvas-sprite text via `IconLayer` (the house contour-label
technique: strokeText halo + fillText, 2× oversampled, cached per color+text, `release()` clears;
a deck `TextLayer` sdf version was built first and rejected 2026-08-23 — synthesized halos looked
wrong at any tuning, and sdf is only worth it for unbounded unique strings; **stress-measured
5,000 stations at locked 120 fps** since value-labels are ~100 unique sprites IconLayer
instances). Values are `format`ed with unit suffix ("31°C", "8 kt") and **colored by
per-parameter severity scales** (2026-08-23): **one file per parameter** in
`layers/observations/` (the polygons event-kind pattern; lead 2026-08-23 "split the code to
different parameters, that's why the folder exists") — each exports an `ObservationParameter`
const (interface in the layer file: `parameter` — the request's own query-param name, lead
2026-08-23 over "wire" — `label`, `colorScale: ColorScale`, precomputed `legend`,
`textOf(point)`; his picks, replacing wire/scale/describe: "you got to work on your naming".
`colorScale` is the settled name for the concept EVERYWHERE — type, builder, and every
field/param including Colormap's and Radar's privates and `buildImage`'s param; a colorOf round
was tried first, then the lead unified: "lets do colorScale everywhere") built
from a local STOPS table; scale and legend are **built once at module load** (`colorScale` +
`gradientLegend`, which lives beside the Legend types in `engine/base/look.ts` — lead 2026-08-23:
a generic helper is "written and used outside", never exported from a feature file; a lazy
per-parameter legend cache Map was the first version and the lead called out the apparatus;
precomputed module consts give legend identity stability for free). The parameter drives label color, hover, AND the legend — `Look.legend` is a
**`Signal<Legend | null>`** across all looks (lead 2026-08-23 — a getter version was built first
and he called it out: signals-first is the house way; static looks wrap theirs in `signal(...)`,
Labels takes a legend fn wrapped in `computed`, the legend-bar reads `legend()`). Four
parameters: טמפרטורה, רוח, גשם (mm/h), and **עננות combined** (lead 2026-08-23: "clouds should be
combined together" — one synoptic pair per station, "6/8 12.5'": `value` = cover eighths, and
`CloudPoint extends ObservationPoint` adds the optional `base` ft (lead 2026-08-23: a
kind-specific wire field never widens the shared point contract — `types/observations.ts` holds
both, cloud's `describe` casts, the one genuine friction point); each parameter's `describe(point)`
builds label AND hover text, color/legend ride the cover scale; new Quantity.CloudCover/
Unit.Eighths + Quantity.CloudBase/Unit.Kilofeet prime notation). Fixture quantizes base to 500 ft
steps — free-precision bases made ~1,700 unique label strings and sprite churn dropped fps to 64;
quantized ≈360 bounded sprites, back to 120 (unique-string boundedness is the Labels look's
scaling contract). All scales are invented stand-ins awaiting the lead's real ones. Hover = nearest station within
0.35°, else —. Relevance = frames
−10min/+60min (latest holds an hour). Fixture: `synthetic-observations.ts` builds **~1,000 land-only
stations** (lead 2026-08-23, grounded on ~8,600 worldwide SYNOP: the lead-supplied
temperature.json stations + deterministic seeds over the wide-sector bbox, land-tested via
`isLand`/`collectLandPolygons`, which live in synthetic-observations.ts since 2026-09-30 — windSpeed.json is no longer
read, delete or keep is the lead's call). Values are **smooth regional ripple fields** per
parameter (lat/lon sines drifting with time + small per-station jitter — lead: "make them change
from area to area so i see the full colored range"), each anchored to the station's own
last-update mark — every 5th station updates hourly, the rest each 10 min, so loop persistence is
visible; route `/api/observations`.

**Satellite layer v1 — static (2026-08-02; full record in [`docs/satellite.md`](docs/satellite.md)):**
first imagery layer. `SatelliteLayer` (`layers/satellite/`) on the lead's wire contract:
`getConfiguration` (default channel/sector + the satellite id to display — the user never picks a
satellite) → bounds once for all satellites × sectors → hours in the last 30 min → one image per
time. Channel (IR/צבעוני) and sector controls are Selects with an **אוטו** choice following the
config default; the תמונה look carries `percent` opacity; startup shows the layer. Both channels
histogram-equalized for display (geo3d `imageDataEqualization` port in `utils/image.ts`),
**original pixels kept** — IR hover = `−80 + 127.4·gray/255 °C` (old app's calibration) through
Units; fixture temps are nonsense by design (fake IR = grayscale visible light) — whether real
wire IR needs an invert-on-receive is an open question for real data (docs/satellite.md). Time rule (lead-simplified 2026-08-02, "as simple as possible"): the ask
is anchored to **the displayed time** — hours for the 30 min before it, `findNearestTime` picks
the closest (the polygons idiom), **one image** fetched at it; back-only window (24/0/1h);
relevance = picture.time +30 min; `keepIfRelevant` compares plain `currentTime`. **`Inputs` is THE
layer seam** (lead): a layer never does `injector.get(TimeService)` — that door is for infra like
`HttpClient`; missing platform state gets raised, not reached around. The single-picture params
carry a JSON-stringify value-`equal` (identity churn refetches). Images are equirectangular →
`BitmapLayer` `_imageCoordinateSystem: LNGLAT` (coastlines glue to the basemap; hover rows linear
in latitude; real-backend projection TBD). Fixture = real EUMETSAT MTG GeoColor via anonymous
EUMETView WMS, 5 same-hour frames (yesterday 09:00Z + i·10 min), one image grayscaled for IR;
`latest` computed per request (never frozen at load). **The look is deliberately static** — the
newest frame as one image: the animation was built four ways (own rAF loop → loopTime on
Look → on Layer → engine-wide Animator → LoopPlayer + LoopLayer) and **stripped 2026-08-02 for a
clean retry**; every ask, decision, rejection, and landmine (per-layer draw isolation or wind
resets at 2 Hz; loop restarts on props change; deck lineage registration) is recorded in
`docs/satellite.md` — read it before re-attempting. Chip image-time spec (inside the handle chip,
`זמן תמונה · HH:mm`, hour only) is part of that retry. Contour labels' `CollisionFilterExtension`
was found silently filtering ALL labels under the interleaved two-`beforeId`-group setup and
removed (2026-08-02) — labels rely on the look's own flattest-stretch spacing; far-zoom cross-line
overlap is the accepted trade, polygons-style relaxation is the answer if it ever bothers.
`boundaries_disputed` style layer (committed): disputed country borders draw everywhere except
inside an Israel-region `within` box (lon 33.8–36.9, lat 29.2–35.0 — must cover Lebanon–Syria or
tile lines braid with the vendored envelope). Top bar is frosted and overlays the map
(`bg-card/75 backdrop-blur-md`, layer card at `top-15`).

**Level selector v1 (2026-08-23, lead-verified spec answers):** the global vertical dimension,
windy-style. `LevelService` (`services/`, the TimeService mirror): `levels` = surface (`null`) +
**every 1,000 ft from 1' to 40'** (lead's list), `activeLevel` signal (session-only — the
settings machinery binds only layer/look fields; persistence is an open plan row). `Inputs`
gained `level()`. **Pressures landed the same day — vocabulary (lead): the collective is
"levels", ft levels are "heights", mb levels are "pressures"**: `Level = number | string`
(number = ALWAYS feet, string = mb), `LevelKind = 'heights' | 'pressures'`; `heightLevels` =
surface (`null`) + the feet list, `pressureLevels` = surface + 1000/925/850/700/500/400/300/250/
200 mb (stand-ins); `kind` signal picks the list (`levels` computed), `setKind` converts the
active level to the **nearest stop in the new vocabulary** through `feetOf` (barometric
`145366·(1−(mb/1013.25)^0.1903)`). **`Layer.staticLevel` (base field, default `true` —
lead-picked negative polarity over usesLevels, double-negative reads flagged)**: a layer opts
into the vertical dimension by overriding `false` (ModelLayer does); the level-bar shows while
any active layer has `!staticLevel` — layers declare, no instanceof (the timeWindow model; an
earlier `followsLevel`-on-ModelLayer + instanceof check was lead-rejected as model-specific
knowledge in the component). **Wire**: feet → `height=<feet>` (**assumed, confirm with backend
lead**; `wrap_info.height` echoes), mb → `pressure=<mb>` (**lead-corrected** — an invented
`level` param was wrong); `ModelLayer.levelOf(level)` maps the rail's level to the requested one.
**Geopotential is pressure-levels only** (lead 2026-09-30: its old static 1000 mb map in ft mode
"is misleading"; a nearest-pressure-surface mapping was built and rejected the same day, and a
backend ask was ruled out — geopotential on a flat height equals the height): `levelOf` returning
`undefined` means "no map at this level" — Geopotential returns it for feet levels, so its data is
null (no request, looks removed) and **any active layer whose data is null dims its menu row** (`isLayerEmpty`, opacity-50;
also true for e.g. polygons with no map in force) — no note (lead: dimming alone). The surface stop (shared by both rails) asks `SFC` on the pressure route (lead 2026-09-30) — the
backend's own `HeightScript` serves HGT at SFC as MB1000 (its "TODO is it optimal?"), and the
fixture mirrors that. Level switches
refetch through request identity, draw follows.
UI: `pages/home/level-bar/` — **slimmed through a live lead-iteration marathon (2026-08-23)** to
a narrow frosted column beside the menu panel (`start-51 top-15`): a **kft/mb cycle toggle** on
top (fixed `w-8`, secondary tint), a clickable bold top label (bare number in mb mode — the unit
lives only in the chip), the rail, and a clickable **`matTerrainRound`** surface icon (the icon
journey — hand-drawn line and hills "goofy", lucideMountain "too sharp", game-icons' gameHills
busy scene-art — ended at material-round terrain from a rendered candidate sheet;
`@ng-icons/material-icons` added). **Rail stops sit at TRUE barometric altitudes**
(`stopPercent` = feetOf/feetOf(max); lead: equal-mb gaps must widen with height — 500→300 spans
more rail than 700→500; drag snaps to the nearest stop by altitude, not by even slots; the feet
ladder is linear so it kept its look). Pointer model = drag previews / release commits (the
time-handle idiom, `dragIndex` local signal); the value chip — "the popup text is helpful" —
**rides the handle on the map side** (`start-full ms-5`), white `bg-primary text-sm`, reading
`N רגל מעפ״י` via `Quantity.Altitude` (display unit Feet, the `רגל מעפ״י` suffix is the Feet
format case) or `300mb`, wrapped in an inner `dir="auto"` span (bidi renders `mb300` otherwise).
Hard-won RTL rule: `dir` for notation goes on an INNER span — on the positioned element itself
it flips the element's own inset-inline resolution (the chip rendered off-screen on both sides
before this clicked). Fixture: real ECMWF since 2026-09-30 — feet heights interpolate through
each point's gh profile, mb levels read directly.
`activeLevel` is session-only (the settings machinery binds only layer/look fields). Deferred
(plan row): level persistence, real level lists, keyboard a11y, height-param confirmation.

**Legends (2026-07-22):** `Look.legend` (`engine/base/look.ts`, default null) — typed like the
Control vocabulary: `Legend = GradientLegend | SwatchesLegend`, discriminated by a `LegendType`
enum so future legend kinds can carry extra fields or custom UI; both current kinds are
`stops: { color, label }[]`, rendered by a template switch. `Colormap` builds it from
its palette plus a new `label: (value) => string` constructor param (temperature °C identity, wind
m/s→kt — every tick flows through the Units module) and it renders as a continuous vertical strip:
low value at the bottom, stops **evenly spaced** (windy's model, not value-proportional — keeps
dense low-end palettes readable). **Severest-on-top is the standard for ALL legends** (lead
2026-08-23): stops are always AUTHORED ascending (colorScale needs that) and the legend-bar
renders both kinds bottom-up — the gradient's `flex-col-reverse` labels + `to top` strip, and
since 2026-08-23 the swatches rows are `flex-col-reverse` too (definitions never reverse
themselves). The observations **rain** legend is a hand-authored `SwatchesLegend` (גשם קל→עז,
the radar bands' vocabulary; lead: textual over mm/h ticks — per-parameter authored legends make
this a one-file edit). `Polygons` receives a hand-authored discrete list (lead-picked
representative colors: low/mid/high clouds, fog, haze, CB) rendered as swatch rows.
`pages/home/legend-bar/` is one frosted accordion card at the bottom-end corner: a title row per
active look carrying a legend (titled by the layer name), one body open at a time: a `linkedSignal`
**auto-opens the last card in the list** — activating a layer brings its legend up (lead
2026-07-22); title clicks switch manually and clicking the open title folds all, until the card
list next changes. Colormap exclusivity means at most one gradient row. Flagged: fog and low cloud share #535353 in the swatch list (the map tells them
apart by fog's grid hatch), and gradient ticks repeat the unit suffix (verbatim `units.format`
output).
