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
  substitutes or build mock infrastructure unasked.
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
4. **All coordinates/time flow through the Geo module.** Lat/Lon, DMS, MGRS, and Zulu/Local are
   formatted in one place, never ad-hoc.
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
  services/           # domain services with no natural feature folder (TimeService)
  engine/             # rendering machinery — ONLY place importing maplibre/deck.gl
    map-service.ts    #   MapService: the maplibre map + camera signals + flyTo/setBasemap/init
    overlay.ts        #   Overlay: deck.gl layer host
    base/             #   building blocks looks are made from (Look, AnimatedLayer)
    looks/            #   one file per render style (colormap, wind-particles; later contours…)
  layers/             # THE CATALOG + the layers domain service
    layers-service.ts #   LayersService: layer/look activation + fetch/draw + shortcuts
    registry.ts       #   the keyed layers record + shortcut bundles
    base/             #   the shared definition machinery (Layer<D> + LookEntry, Shortcut)
    model/            #   ModelLayer machinery + one file per model layer (temperature, wind, …); future kinds get sibling folders
    polygons/         #   PolygonsLayer (+ EVENT_APPEARANCES record + SECTORS) + one file per forecast-event kind
    coordinates/      #   Coordinates readout layer (no looks; hover-only + persisted format control)
  objects/            # runtime data classes built from DAOs (e.g. Grid)
  types/              # backend data contracts (DAO shapes); area-specific interfaces colocate
  utils/              # pure functions; similar functions share a file, split when grown
                      #   units.ts = the Units module (§4.3 — every rendered value flows through it)
                      #   geo.ts = the Geo module (§4.4 — formatCoordinates decimal/DMS/MGRS) + mercator/bounds math
                      #   settings.ts = setting() persistent signals + registerLayers (localStorage; keys derive from registry key + LookKind + field)
                      #   controls.ts = the Control vocabulary (options/percent/color) — setting-signals with UI metadata attached
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
rule. Adding a layer of an existing render style = exactly one new file in `layers/`.

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
- **Unix times are ms, end to end** (lead, 2026-08-06): the backend sends unix ms and the whole
  platform holds ms — `Date.now()` raw, `new Date(unixTime)` direct, duration math through the
  unit helpers in `utils/time.ts` (`hoursToMs`/`minutesToMs`/`daysToMs` + `msToHours`/`msToDays`,
  lead 2026-08-09 — TimeUnit-style, no naked `3_600_000`s). No seconds anywhere; identifiers say
  `Ms` (`stepMs`), never spelled out. Human-facing durations stay hours/minutes fields
  (`TimeWindow.backHours`, `stepMinutes`) converted at use.
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
  class (or functions) using it. Known prior art left alone: wind-particles' lead-approved
  tuning-knobs block at the top of that file (2026-07-30).
- **Styling:** Tailwind utilities for layout/spacing; design tokens for color/typography; logical
  properties for direction. No magic numbers — use tokens.
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
the midpoint) — and its constant `Texture` feeds the same `BitmapLayer` warp (mercator-banded y).
Two hard-won shader rules: the fade decays **alpha only with rgb pinned white** (multiplying rgba
grays old trails), and the decay is **floored at 8-bit resolution** (`floor(a·DECAY·255)/255`) —
otherwise low alphas round back up and paint permanent residue on the map. Tuning knobs at the top
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
The layer card: foldable groups (explicit chevron, never auto-unfold; a layer's control/look rows
sit in an indented container behind a thin start guide line — tree look, lead-picked from three
screenshot mockups 2026-07-22, gated by `hasChildRows` so an active layer with nothing visible
draws no stub), checkbox per look, and
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

**Fixture backend synthesizes on request (2026-07-06):** the 287 pre-generated grid JSONs and the
generator tool are gone. `dev/fixture-backend/synthetic-weather.ts` computes any requested
(param, model, bbox, time) `Wrap` analytically — real GFS wind (drifted by forecast hour so time
scrubbing is visible) + synthetic pressure/temperature/waves, land-masked waves. Sources: two files
in `public/fixtures/` (`gfs-surface-wind.json`, `land.geojson`). Run time = app load, snapped to
3h — fixtures can never go stale.

**spartan/ui adopted, chrome rebuilt on it (2026-07-06):** initialized via `@spartan-ng/cli`
(slate theme; dark is the default via `class="dark"` on `<html>`; CLI config in `components.json`).
Helm components are copied into `src/spartan/` (button, checkbox, dropdown-menu, popover, slider, switch,
utils so far; deliberately outside `app/` — it's the vendored look layer, rarely touched) and imported as `@spartan-ng/helm/*` through
tsconfig paths; ESLint's selector-prefix rules are off for that folder (spartan keeps its `hlm*`
selectors). Header, basemap switcher, layer bar, and time bar use `hlmBtn`/`hlm-slider`; selection
lists show the active item by switching `variant` (`default`↔`ghost`) + `aria-pressed`. The
custom color tokens in `styles.css` are deleted — spartan's CSS-variable theme is the only color
system (Heebo `--font-sans` kept). **Chrome look (lead, 2026-07-06): full-bleed map, floating
frosted-glass instrument cards** — one card recipe (`rounded-xl border bg-card/75 backdrop-blur-md
shadow-lg`) for the layer card (top-start), legend accordion (bottom-end), and centered bottom
time bar; slim `bg-background` top bar owned by the home page itself (no global header — the
frame is a bare page slot, lead 2026-07-22). The basemap picker is a top-bar icon button
(lucidePalette, end side) opening a spartan dropdown of the styles (lead 2026-07-22 — the floating
top-end card is gone). Backdrop-blur is an always-on compositor cost over the animating
map (flagged, accepted by the lead — small vs the per-frame canvas upload; can move behind a
quality knob if fleet measurement ever demands; the per-frame canvas upload it was once weighed
against is gone since the GL particles, 2026-07-30). The old custom look is retired — do not
imitate it in new chrome.

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
too) → 3× bilinear upsample → marching squares (edge-id segment stitching into open polylines that
stop at data edges; saddles disambiguated by cell center) → Chaikin ×2. Hand-rolled over d3-contour
deliberately: d3 returns closed polygons, meaning border-frame segments and NaN-hole outlines that
cost more to strip than the tracer itself. `engine/looks/contours.ts` renders two `PathLayer`s (dark casing
under a colored core — readable on any background) plus windy-style label sprites: each unique
level text is canvas-rendered once (stadium pill in the look's color, luminance-picked white/black
text, dark outline matching the casing, cached per look) and drawn via `IconLayer` at fixed pixel
size — constant at every zoom, chip and text inseparable — rotated to the line's local direction
(mercator-corrected, never upside down) and anchored on each label-span's flattest stretch (score
`1.5·|tilt| + bend`). Constructor `(provider, LevelPicker, label, color)` — each contour set
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
(card recipe, `dir=ltr`) above the time bar's end side, visible only while `loopTime` is non-null
— ⏮ ⏸/▶ ⏭ (lucide) + a ×N **cycle chip** ×0.5/×1/×2/×4 (an in-strip block was tried first —
lead: too cramped — and a popover speed slider — lead: cycle icon instead). `LoopPlayer.playing`
+ `speed` signals (speed scales frameMs; the hold stays 1500ms wall at any speed; session-only),
public `play()`/`pause()`/`stepFrame(±1)` over private `run()`/`halt()`; `stepFrame` auto-pauses
and walks the merged times list with wraparound; `setTimes` respects a user pause while loops
live, but the pause **dies with the loop session** (empty setTimes resets playing — pausing then
re-showing a loop layer plays, the lead's bug). Perf HUD moved `bottom-18`→`bottom-28` to clear
the pill's band. The timeline view boots **centered on now** (lead's ask — `paddedWindow` centers
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
with rare cores. Frame content maps through `sourceMixAt` (`synthetic-satellite.ts`, shared): a
**crossfade-closed 7-slot cycle** — 5 real sources forward, then two synthetic slots dissolving
frame 4 back into frame 0 (mix ⅓, ⅔), so motion never reverses and never rewinds (the classic
seamless-loop trick; replaced ping-pong 2026-08-19, lead disliked the direction reversal, which
had replaced plain `% 5` whose 25-min cycle put a 40-min rewind in every loop — "maybe its the
picture itself"). The 35-min cycle ≈ the ~30-min window, so even the loop restart lands one
cycle-step apart (sim: every window alignment wraps at distance 1). Satellite blends via
`globalAlpha` draw; radar lerps the two sources' still-ground-subtracted cloudiness. The radar
still rounds its frame time to the nearest slot before mapping (nearest-source, matching
nearest-display atTime — with floor-baking the rain visibly trailed the cloud at every 5-min
boundary, lead caught that too). Kills three rejected generations: the vendored
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

**Legends (2026-07-22):** `Look.legend` (`engine/base/look.ts`, default null) — typed like the
Control vocabulary: `Legend = GradientLegend | SwatchesLegend`, discriminated by a `LegendType`
enum so future legend kinds can carry extra fields or custom UI; both current kinds are
`stops: { color, label }[]`, rendered by a template switch. `Colormap` builds it from
its palette plus a new `label: (value) => string` constructor param (temperature °C identity, wind
m/s→kt — every tick flows through the Units module) and it renders as a continuous vertical strip:
low value at the bottom, stops **evenly spaced** (windy's model, not value-proportional — keeps
dense low-end palettes readable). `Polygons` receives a hand-authored discrete list (lead-picked
representative colors: low/mid/high clouds, fog, haze, CB) rendered as swatch rows.
`pages/home/legend-bar/` is one frosted accordion card at the bottom-end corner: a title row per
active look carrying a legend (titled by the layer name), one body open at a time: a `linkedSignal`
**auto-opens the last card in the list** — activating a layer brings its legend up (lead
2026-07-22); title clicks switch manually and clicking the open title folds all, until the card
list next changes. Colormap exclusivity means at most one gradient row. Flagged: fog and low cloud share #535353 in the swatch list (the map tells them
apart by fog's grid hatch), and gradient ticks repeat the unit suffix (verbatim `units.format`
output).
