# CLAUDE.md — Meteo Platform Frontend

Auto-loaded every session; this file is the project's operating law and wins over habits, defaults
and skills. Read it, then the `docs/` file for the area you touch (§10). Everything important lives
here and in `docs/` — never only in chat or in local memory.

## 1. Mission

A rebuild, from zero, of the frontend of a meteorological viewer: a map with many colorful,
animated weather layers plus point tools (later tables/reports). The old app is Angular 10, built
by ~25 rotating juniors over 6 years — a mess. The Python backend is being rebuilt too. Priorities:

1. **Handoff-able and junior-readable** — co-equal with "it works". Whoever comes next must be able
   to copy an existing file and stay correct.
2. **Runs well everywhere**, including 8 GB mini-PCs with integrated GPUs.
3. **Looks great and absorbs new features for years.**

## 2. Working with the lead

- **Questions → build.** Every task starts with questions, one at a time, via AskUserQuestion with
  offered answers (recommendation first). The answers ARE the approval — then build. Never post a
  design, spec, plan or "approve?" summary, short or long; this overrides any skill's design gate
  (superpowers brainstorming included). Unsure → one more question.
- He can't see text written before a dialog, nor option `preview` fields. What he must read goes in
  the question text or option descriptions, or as plain text ending the turn.
- Concise: short sentences, the point first, ~1–3 sentences per answer; tables are fine.
  Explaining code = file names + one-line purpose each.
- Offer, don't choose — even with an obvious default. "Rename X" without a name = offer candidates
  (Kotlin-flavored names welcome). An approved option does not approve assumptions in its
  description: behavioral edge cases get their own question with a concrete example.
- Domain questions in plain words (he isn't a meteorologist); when he delegates, anchor on the
  real-world thing he named and state the pick. Expert-only features → offer to park them. A
  visual trade-off is described as what he'd see on screen, never in engine terms.
- Flag an unconventional ask once ("most teams do X, because Y"), then follow his call. Stack
  recommendations state maturity and risk, not just strengths.
- Voice every concern in one honest sentence, but never let it gate or water down the work. Never
  sacrifice looks for performance — weak PCs get quality knobs.
- Don't assume; verify even when fairly sure. He supplies domain data (formats, photos) — never
  fetch public substitutes or build mock infrastructure unasked. He can't test on target hardware:
  give reasoned assessments, labeled as such.
- Dev tooling (perf HUD, diagnostics, fixture plumbing): build without asking, mention it.
- Commit only when he writes "commit" after reviewing the uncommitted diff — not "looks great", not
  an option whose description mentions committing. Leave unapproved work out of a commit.
- Never touch the git index unless he asks. No `git add`, `reset`, `restore --staged`, `mv`, `rm`,
  `stash` or `checkout <rev> --` — move and delete files with plain `mv`/`rm`. Staged = he has
  scanned it (still open to edits, not locked); unstaged = not reviewed yet.
- His code is his: suggest, never redesign it. He edits mid-review — re-read before editing, adopt
  his renames, never revert. Prettier only on files you created; match his hand formatting.
- `// TODO: UNVERIFIED CODE BELOW` marks code he hasn't read — never remove or move it (extend it
  over new dense code beneath). Otherwise no code comments yet.
- He names an old commit or a reference image as the target → reproduce it exactly (port the old
  algorithm verbatim; describe the image's structure first; trace geometry programmatically).
- Big code drops scare him: offer the lean version — simplify the feature, not just the code.
  Build the simplest concrete version first to prove the plumbing, in the shape it will grow into.
- Execute inline, never subagent-per-task. Docs meant for humans (backend asks) are one-liners.
- Review lists and reading orders cover product code only (never `dev/` or `docs/`).
- **The tree breathes**: place things generally right; when a file or folder gets crowded, propose
  a reorganization — he decides, every time. Never restructure silently.
- **Docs are ours** (he doesn't read them). He makes us do trivial edits so we learn his taste:
  record every correction once he approves the result — one line, as a principle, in the right
  place (§6, §9, or the area doc's rules / rejected list). Edit current-state text, never append
  history; no dates, no stories (git has them). This file stays around 250 lines.

## 3. Stack (locked — rationale in docs/decisions.md)

Angular 22 (standalone, zoneless, signals-first, SPA) · spartan/ui on CDK + Tailwind · one signal
`@Service` per domain · MapLibre GL + deck.gl + luma.gl with first-party looks (2D only; globe
deferred) · Turf.js, d3-scale/color/interpolate · no i18n framework, RTL mandatory · Chrome 112
floor · light/manual testing + strict TS + ESLint/Prettier, no committed tests · open internet in
development, closed network at delivery (all runtime assets self-hosted, deps vendored at cutover).

Angular guidance: the official `angular-developer` skill and the Angular CLI MCP
(`get_best_practices`, `search_documentation`), plus the custom `angular-v22` skill (user-generated
— verify conflicts against the installed packages). spartan reference: the spartan-ui MCP. Our
locked conventions win where they differ.

## 4. Architecture rules

1. **Engine boundary.** maplibre, deck.gl and luma.gl are imported only in `src/app/engine/`.
   `MapService` owns the map and is the library boundary.
2. **A layer is a definition, not engine code.** A layer of an existing look = one file in
   `layers/` + a registry entry. Layers read platform state only through `Inputs`.
3. **All values flow through the Units module** (`utils/units.ts`); **all coordinates and times
   through the Geo/time helpers** (`utils/geo.ts`, `utils/time.ts`). Times are local only.
4. **State lives in one domain service** that co-locates its signals and the methods that change
   them (no stores layer, no data-service + functions-service split).
5. **Shared code never names a feature** — features plug into a contract (measuring is a layer).
6. **RTL by construction**: logical properties, never left/right; a direction island needs the CDK
   `Dir` directive on its wrapper (CDK/spartan read `Directionality`, not a bare `dir`).

## 5. Tree

```
src/app/
  app.ts/.html, app.config.ts, app.routes.ts   # bare router outlet; '/' = home page
  pages/home/        # the front page and its features, one folder each: top-bar, loop-pill,
                     #   layer-bar (+ control/), legend-bar, level-bar, hover-readout,
                     #   time-bar (+ TimeBarService), settings-panel (+ settings-controls.ts),
                     #   point-menu (+ PointService),
                     #   meteogram (+ MeteogramService, frame, colormap, one folder per chart),
                     #   sounding-table (+ service), measure (+ MeasureService)
  services/          # cross-domain services: TimeService, PlayerService, LevelService
  engine/            # map-service.ts, overlay-service.ts, base/ (Look, AnimatedLayer, GridIcons,
                     #   PointIcons, sprite-cache), looks/ (one file per look)
  layers/            # layers-service.ts, registry.ts, base/ (Layer, LoopLayer, LayerGroup,
                     #   Shortcut), one folder per kind: model/, polygons/, satellite/, radar/,
                     #   birds/, lightning/, observations/, general/ (coordinates, measurement)
  directives/        # MapPin
  objects/           # runtime classes built from wire data (Grid, MeteogramData, Sounding,
                     #   PolygonMap, Provider)
  types/             # wire contracts (DAO shapes) mirroring the backend
  utils/             # pure functions; similar ones share a file (units, geo, time, settings,
                     #   controls, contours, interpolation, color-scale, thermodynamics, wind…)
  dev/               # quarantine: fixture backend + perf HUD — product code never imports it
                     #   (pages may mount dev widgets; environment.development.ts registers the
                     #   fixture interceptor, prod swaps the file out)
src/spartan/         # spartan Helm components copied in — ours to fix, imported @spartan-ng/helm/*
public/              # basemaps/, fonts/, icons/ (SVG pairs), fixtures/ (dev data)
docs/                # see §10
```

Where a service lives: shared across domains → `services/` or its domain folder; owned by one
feature's UI → that feature's folder. Interfaces colocate with the area that owns them.

## 6. Conventions (copy existing files; never let two ways coexist)

**Angular.** Standalone, OnPush, `input()`/`output()`, native control flow. Every component has its
own folder with separate `.ts` + `.html`; a `.css` only for real styles (`host: { class: 'block' }`
instead of `:host`). Signals for state; events are plain public `readonly x = new Subject<T>()`
(never a private Subject + `asObservable()`). Effects sit at the top of the class beside the state
they watch. A derived value is a `computed`, never a method or getter. Resources are created in a
non-reactive context. Use framework idioms at the call site (`r.hasValue() ? r.value() : …`) —
no wrappers that only rename an API. Built-in pipes over formatting methods. Visuals live in
templates, not in DOM or class strings built in TS. Every `@Service` class ends in `Service`; an
injected field is the class name without it (`time`, `map`, `player`) — `layersService`, since
`layers` is the registry — and injected fields carry no `readonly`. App policy (startup layers)
stays in pages; services expose verbs; no inject-just-to-initialize services. Follow the documented
convention by default; a deviation needs a stated reason up front.

**Naming.** Descriptive, no abbreviations a junior wouldn't know ("obs" is accepted). One concept =
one name everywhere (`colorScale`). Methods are verb + explicit noun (`showLayer`, `buildImage`);
state uses "active" (`activeLayers`, `isLookActive`), actions use show/hide. `-Of`/`-At` only for
cheap reads (`valueAt`, `textOf`); work functions state the act (`create…`, `calc…`, `find…`, `is…`;
never `paint…`); a name says what it returns (`loopIdOf`). Names describe the thing, not its one
use; no container words (member, slot, item); no jargon he doesn't use ("strike", "rasterize"; a
dark border is an "outline", never a casing or halo); old-app vocabulary for domain names
(`EventAppearance`, `eights`); wire enums named after the wire value (`SatelliteChannel.IR10_8`);
fields named as the wire names them (`parameter`). Siblings taking the same kind of param use the
same name. "timeline" is reserved for a future feature.

**Types.** Fewest types that read clearly: same shape = one type (names carry semantics); no
params bag duplicating an existing options shape (positional args or `Pick`); values always set
and read together are one field; a few explicit lines beat a generic combinator. Domain objects are
classes with behavior; class instances over interfaces; polymorphism over `instanceof`/kind
branches; plain-data descriptors rendered by templates get an enum discriminator (`ControlType`,
`LegendType`), never a mode boolean. Plain TypeScript over clever types. Convert wire → internal on
receive, with named conversion functions. A kind-specific wire field never widens a shared
contract — the kind's type extends it. Absent-able fields: `x?: T = undefined`; guaranteed-by-
sequence fields: `x!: T`. `undefined` = not yet, `null` = deliberately nothing.

**Sharing and placement.** Siblings repeating a lifecycle → a parent class that removes whole
methods behind a one-method contract (`LoopLayer`, `GridIcons`) — extract it in the same change,
and reshape "misfits" to fit before leaving them out. Generic pure functions go to `utils/` even
with one user; feature-specific logic (one look's geometry included) stays a private method of its
class. A generic helper is never exported from a feature file — it lives beside the vocabulary it
builds. Machinery-of-one lives beside its feature, not in `base/`. A shared file holds one concept
— never a grab-bag of unrelated helpers. A folder of per-kind files means a growing in-class table
splits into one file per kind, unasked. Display state stays out of domain services; a shared
concept gets one owner service. Premade libraries over hand-rolled for anything standard, except
60 fps hot loops. No speculative guards, back-compat shims, or handling for cases he says don't
exist; shelved ideas get a plan.md line. One rule per gesture: simplicity and predictability beat
convenience branches. Files stay small and single-purpose. Refactors keep behavior and look exact.

**Constants and colors.** Tuning numbers inline at the point of use (the wind-particles knob block is
the one exception); tunables as defaulted parameters; an external library's contract gets a named
const. A single-user const is a `private readonly` field; several users → directly beside them.
Palettes are module consts directly above their class, exported only when another file uses them.
Colors are authored as hex through `rgba('#hex', alpha)`, never RGBA arrays (derived math exempt).
Derived state over a static table is computed once at module load in the kind's own file.

**Values and data.** Every rendered value: `format`/`formatNumber`/`unitLabel(value, Quantity,
fromUnit)`, `NaN` → `—`; a hover with nothing to show returns `null` (the chip prints the dash).
A quantity whose audience uses one unit gets its own Quantity with a forced unit (bird heights in
m). Unix times are ms end to end (`stepMs`), seconds only at the wire edge,
durations via `hoursToMs`/`minutesToMs`. New views reuse the owning feature's outputs; never invent
values the wire lacks — change the presentation. A layer that can't truthfully show the picked
state shows nothing (its row dims) — never a nearby substitute. Nothing holds data while hidden:
look caches clear in `release()`, layer caches live inside `fetch()` and die with it. No code for
stale local dev state (localStorage migrations): clear it; never assume the site is in production.

**Styling.** Tailwind for layout, theme tokens for color, spartan components first
(docs/chrome.md).
Flattest rendering that carries the data; every decorative device must earn its code. Function and
data completeness before polish — never hide a needed value for a prettier layout.

## 7. Verification

- Tier it: renames, refactors and one-line tuning with a certain outcome → `ng build` only;
  behavior changes → build + one live probe; wire/fetch/reactivity → build + live probe + console.
  During rapid review, batch and verify at pauses.
- `ng build` is the type gate (tsc skips templates). `ng serve` keeps serving the last good bundle
  after a failed rebuild — check its logs before trusting a live check; restart it after file moves.
- Use the lead's dev server on :4200 (`attach` in `.claude/launch.json`); start your own only when
  it's down, and stop it after.
- Map visuals: Playwright MCP renders WebGL headless. The embedded browser pane can't composite,
  and its `read_page` can click the buttons it reads — use evaluate + screenshots. A long-lived
  Playwright instance degrades (frozen CSS transitions, ~1 fps, screenshot timeouts): restart it
  before blaming the app.
- UI options are mocked by restyling the live app in Playwright (about 4 variants a round, sent as
  files), never crude widget mockups (backdrop blur stalls headless screenshots — mock frost with
  an opaque tint). Measure alignment in the live DOM to ≤ 0.5 px before showing
  any table or layout.
- No committed tests; temporary Vitest checks for hazard logic (conversions), deleted after.

## 8. Performance and dependencies

- Target 60 fps with ≤ 5 layers + 1 animation on an integrated GPU at 1080p; match or beat the old
  Cesium app. Quality knobs and the perf HUD are the insurance; perf concerns about visuals are
  flagged, never silently applied.
- Use good libraries freely now; prefer ones that survive the cutover audit (no phone-home, CDN or
  telemetry). Runtime assets are self-hosted. Details: docs/dev/vendored-dependencies.md.

## 9. Landmines (each already cost a bug)

- A `[class]` string binding on `hlmBtn` drops the variant classes — per-key `[class.x]` or a new
  variant in our button copy.
- `AnimatedLayer`: the rAF loop stays bound to the first deck instance — `step()` reads `state`
  only. Per-frame accessors on identity-stable data need `updateTriggers`.
- `httpResource`/`resource` inside an effect or computed → NG0602.
- A computed returning a fresh object that feeds a resource request refetches silently forever —
  give it a value `equal`.
- maplibre forces `position: relative` on its container in unlayered CSS — size a wrapper div.
- ng-icon's `vertical-align: initial` beats Tailwind — aligning needs `!` (`align-[-0.2em]!`).
- `dir` for notation goes on an inner span; on a positioned element it flips its own insets.
- A child of a backdrop-blurred element can't frost the page — put the frost on an
  `absolute inset-0 -z-10` layer inside an `isolate` card.
- spartan's `transition-all` animates a moving `left` — position through a plain wrapper div.
- `CollisionFilterExtension` hides every label under the two `beforeId` layer groups.
- maplibre `Marker.addTo` removes the marker first — calling it again kills a drag.
- App settings defined in a file the registry imports → an import cycle crashes boot ("Class
  extends value undefined") — keep them in the import-light `settings-controls.ts`.
- An unannotated `Provider` lambda infers `never` and skips type checking — annotate the parameter.
- Wind trails: fade alpha only (rgb pinned to the ink) and floor the decay at 8-bit, or old trails
  gray out and residue stays on the map.
- HMR leaves orphan rAF loops — refresh before judging performance.
- Edit Hebrew files with UTF-8-safe tools only (a PowerShell `-replace` once mangled them).

## 10. Where things live

| Read | When |
|---|---|
| [docs/vision.md](docs/vision.md) | what the product is, who uses it |
| [docs/plan.md](docs/plan.md) | choosing or continuing work (the task pool) |
| [docs/layers.md](docs/layers.md) | layers, registry, shortcuts, controls/settings, levels |
| [docs/engine.md](docs/engine.md) | looks, map service, overlay, wind particles, basemaps |
| [docs/time.md](docs/time.md) | time service, loop player, time bar |
| [docs/point-views.md](docs/point-views.md) | chooser, meteogram, sounding table, measure |
| [docs/chrome.md](docs/chrome.md) | page layout, menu, legend, settings, visual language |
| [docs/backend.md](docs/backend.md) · [backend-asks.md](docs/backend-asks.md) | any request or wire type |
| [docs/fixtures.md](docs/fixtures.md) | the dev fixture backend |
| [docs/decisions.md](docs/decisions.md) | why the stack is what it is |
| [docs/domain/](docs/domain/) | meteorology, polygons, units/coordinates/time |

## 11. Status

The front page runs on fixture data shaped like the real backend: 13 map layers, shortcuts, a
zoomable time bar with loop playback, a level rail, legends, hover, settings, meteogram, sounding
table and distance measuring. Work goes one small task at a time from docs/plan.md — the lead picks.
