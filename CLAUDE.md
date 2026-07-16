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
| Map engine | **MapLibre GL JS + deck.gl** with **first-party weather-layer renderers** (WeatherLayers GL removed 2026-06; globe/3D temporarily removed — returns after first-party particles are verified) | Always behind the engine adapter |
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
  app.ts/.html/.css   # the frame itself: header bar + page slot (no separate "shell" concept)
  app.config.ts       # app wiring (providers)
  app.routes.ts       # URL → page map ('/' = the home page)
  pages/              # one subfolder per page of the site
    home/             # the front page: the map view (layer-bar, time-bar)
  services/           # domain services with no natural feature folder (TimeService)
  engine/             # rendering machinery — ONLY place importing maplibre/deck.gl
    map-service.ts    #   MapService: the maplibre map + camera signals + flyTo/setBasemap/init
    overlay.ts        #   Overlay: deck.gl layer host
    base/             #   building blocks looks are made from (Look, AnimatedLayer, GeoCanvas)
    looks/            #   one file per render style (colormap, wind-particles; later contours…)
  layers/             # THE CATALOG + the layers domain service
    layers-service.ts #   LayersService: layer/look activation + fetch/draw + shortcuts
    registry.ts       #   the keyed layers record + shortcut bundles
    base/             #   the definition machinery (Layer<D> + LookEntry, ModelLayer, Shortcut)
    model/            #   one file per model layer (temperature, wind, geopotential, …); future kinds get sibling folders
  objects/            # runtime data classes built from DAOs (e.g. Grid)
  types/              # backend data contracts (DAO shapes); area-specific interfaces colocate
  utils/              # pure functions; similar functions share a file, split when grown
                      #   units.ts = the Units module (§4.3 — every rendered value flows through it)
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
- **Every component lives in its own folder with three separate files** (`.ts` + `.html` + `.css`)
  — no inline templates/styles, even for tiny components (lead-locked; overrides the official
  "prefer inline for small components" guidance).
- **Interfaces colocate with the area that owns them** (e.g. layer interfaces in `layers/`);
  backend contracts go in `types/`. No global interface dump.
- **`dev/` is quarantined:** product code (`engine/`, `layers/`, `utils/`, `settings/`, the frame)
  must never import from `dev/`; only page templates may mount dev widgets. (One recorded
  exception: `environment.development.ts` registers the dev fixture-backend interceptor; prod
  builds swap the file out via `fileReplacements`, so no mock ships.)
- **Naming:** descriptive, no abbreviations a junior wouldn't know. One concept = one name everywhere.
  Methods are verb+noun with the noun explicit (`showLayer`, `hideLook`, `toggleGroup` — never a bare
  `show()`/`activate()`); **state** uses the "active" adjective (`activeLayers`, `isLookActive`,
  `defaultActiveLayers`), **actions** use show/hide verbs (lead, 2026-07-13).
- **Files stay small and focused.** If a file is doing two things, split it. (Old codebase pain.)
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

**The product today:** 2D map (globe/3D returns only when first-party particles are verified
trustworthy), self-hosted basemaps, dev fixture backend, and the layer/look data pipeline —
layer kinds subclass the generic `Layer<D>` (name, looks, timeWindow, `hover(data)`, `fetch()`;
2026-07-15 split): `ModelLayer` (D = `Grid[]`) carries `parameters`/`models` and fetches grids per
parameter (bbox-windowed); future kinds (satellite/radar/observations) implement their own
`fetch`/data. A `Provider<I>` shapes each layer's data into each look's input — the
data side is untyped in the class; each definition annotates its lambda (`(grids: Grid[]) => …`),
so looks and providers stay source-blind; `Look<I>.deckLayer()` produces the rendered layer; keyed
registry + `LayersService`. Layers: temperature colormap; wind = speed colormap + canvas-trail
particle look.

**Wind look baseline (2026-07-05, code + concept approved; visual open to later tuning):** the
windy.com canvas technique — `TrailCanvas` (in `looks/wind-particles.ts`) simulates 2000 particles
(distance-sampled crumb trails, speed-scaled trail length, drain-out deaths, prime-stride even
spawning) and strokes them onto a `GeoCanvas`; rendered as a `BitmapLayer` (ping-pong canvases —
deck caches textures by image reference). ~60 fps measured. Machinery in `engine/base/`:
`Look` contract, `AnimatedLayer` (owns the rAF loop; subclasses implement `step(dt)` + `rebuild()`,
invoked via deck's own props diff), `GeoCanvas`. `TrailCanvas` stays a separate class by design:
deck discards layer instances constantly and migrates only `props`/`state` — the canvas object in
`state` is what survives. Dev-server note: HMR leaves orphaned rAF loops (page slows over many
hot-swaps) — a page refresh clears it; production teardown is correct via `finalizeState`.

**Time scrubber (2026-07-06, lead-verified):** generic
`TimeService` in `services/` (tools + window merging only — no layer knowledge; windows are pushed
in), `Layer.timeWindow` per layer (default 24/96/3h; may move to menu-side later — lead leaning
menu, layer chosen for now because cadence is data-nature), `Inputs.time()` feeds `Layer.request`
(no more `Date.now()`), bottom `time-bar` (Now/עכשיו + slider + ±h labels + arrow keys, he-IL
labels; **dragging commits on release only** — mid-drag the label previews the snapped time from a
local scrub signal, `jumpTo`/refetch fire on pointerup), `utils/time.ts` (snap/clamp/format —
future Units/Geo seed). **Multi-layer stacking landed
2026-07-14 (complete, 5 steps):** layers stack; `Look` carries a `kind` and the `Overlay`
stable-sorts by the `LookKind` rank order (image < colormap < contours < particles < polygons <
icons < text — lead reordered contours below particles 2026-07-14); colormap-kind looks are mutually exclusive across layers; state vocabulary is
*active* (`activeLayers`/`activeLooks`/`isLookActive`), actions are show/hide verbs. Definitions
carry `Layer.name` + per-look `{ look, name, checked }` — `checked` starts as the definition default
and mutates in place as the layer's session memory of its checkbox states (kind vocabulary:
צבעים/אנימציה/קונטורים).
The layer card: foldable groups (explicit chevron, never auto-unfold), checkbox per look, and
**generic controls** (2026-07-15): looks/layers expose `controls: Control[]` — typed descriptors
rendered by one template switch — `options(initial, choices, label?)` (a persisted setting-signal
with metadata attached; one `cycleOptions` serves particle speed ×0.5/×1/×2 AND temperature's
מודל picker, which refetches via the signal read inside `fetch`), `percent(initial)` (colormap
opacity popover; image memoized per grid so drags cost a uniform), and `{ type: 'color' }`
(contour identity squares). Caution: control metadata attaches via `Object.assign` onto the signal
function — `name` is read-only on functions, hence the `label` field. Hover readout: one labeled line per active layer.
Trail canvas sizes to the bounds' on-screen pixel footprint (capped 2048) — particle thickness no
longer varies with window size. Geopotential-height layer (wire name `hgt`, 1000 hPa, sky-blue
contours every 20 m) joined on the contours look. **Shortcuts (`layers/base/shortcut.ts` + registry
`shortcuts` record) are package-deal bundles and the primary UX (vision.md):** a קיצורים section
tops the menu; pressing מזג אוויר applies exact per-layer look sets (`{ layer, looks: LookKind[] }`);
pressed state derives (all member layers active) so turning a member off releases the pill while
the rest stay; settings tweaks don't break the package; startup applies the weather shortcut.
The look⇒layer seam resolved itself: shortcuts activate layers, the invariant stands. Watch:
`LayersService` is growing — propose a split when it next grows (lead, 2026-07-14).

**Fixture backend synthesizes on request (2026-07-06):** the 287 pre-generated grid JSONs and the
generator tool are gone. `dev/fixture-backend/synthetic-weather.ts` computes any requested
(param, model, bbox, time) `Wrap` analytically — real GFS wind (drifted by forecast hour so time
scrubbing is visible) + synthetic pressure/temperature/waves, land-masked waves. Sources: two files
in `public/fixtures/` (`gfs-surface-wind.json`, `land.geojson`). Run time = app load, snapped to
3h — fixtures can never go stale.

**spartan/ui adopted, chrome rebuilt on it (2026-07-06):** initialized via `@spartan-ng/cli`
(slate theme; dark is the default via `class="dark"` on `<html>`; CLI config in `components.json`).
Helm components are copied into `src/spartan/` (button, checkbox, dropdown-menu, popover, slider,
utils so far; deliberately outside `app/` — it's the vendored look layer, rarely touched) and imported as `@spartan-ng/helm/*` through
tsconfig paths; ESLint's selector-prefix rules are off for that folder (spartan keeps its `hlm*`
selectors). Header, basemap switcher, layer bar, and time bar use `hlmBtn`/`hlm-slider`; selection
lists show the active item by switching `variant` (`default`↔`ghost`) + `aria-pressed`. The
custom color tokens in `styles.css` are deleted — spartan's CSS-variable theme is the only color
system (Heebo `--font-sans` kept). **Chrome look (lead, 2026-07-06): full-bleed map, floating
frosted-glass instrument cards** — one card recipe (`rounded-xl border bg-card/75 backdrop-blur-md
shadow-lg`) for the layer card (top-start), basemap switcher (top-end), and centered bottom time
bar; slim `bg-background` header. Backdrop-blur is an always-on compositor cost over the animating
map (flagged, accepted by the lead — small vs the per-frame canvas upload; can move behind a
quality knob if fleet measurement ever demands). The old custom look is retired — do not imitate
it in new chrome.

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
