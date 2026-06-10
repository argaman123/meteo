# CLAUDE.md — Meteo Platform Frontend

> This file is **auto-loaded into context at the start of every session**. It is the project's
> operating law. It is intentionally prescriptive. When something here conflicts with a habit or a
> default, **this file wins**. For depth, read the linked docs in [`docs/`](docs/).
>
> **New session? Read this file, then [`docs/vision.md`](docs/vision.md) and the current spec in
> [`docs/specs/`](docs/specs/). Nothing important lives only in chat — it lives here and in `docs/`.**

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
| Components | **Angular CDK** + **Tailwind** now; **add PrimeNG 22 when it ships** | See checkpoint below |
| State | **Signals + small injectable signal-stores** per domain | No NgRx |
| Map engine | **MapLibre GL JS (globe) + deck.gl + WeatherLayers GL** | Always behind the engine adapter |
| i18n | **No translation framework.** Each element authored in one language. **Bidi/RTL is mandatory** | Self-hosted Hebrew+Latin font |
| Styling/theme | **Design tokens** (CSS variables) → Tailwind + (later) PrimeNG token theme | Presets = declarative config |
| Testing | **Light/manual** + strict TypeScript + ESLint/Prettier; **no committed unit tests for now** — temporary Vitest checks verify pure units/geo/time logic during development, then are deleted | Lead 2026-06-10; wrong conversions remain a flagged hazard — revisit when Units/Geo modules land |
| Rendering | **Client-side SPA, no SSR** | WebGL needs the browser |
| Network | **Internal-only**; **dependencies vendored/offline** | Strict dependency budget |
| Browser floor | **Chrome 112** (fleet-pinned) | `browserslist`-enforced; Chrome-for-Testing 113 smoke test; ratchet at cutover |

**PrimeNG checkpoint:** As of June 2026 PrimeNG supports Angular 21 only (v21.x); Angular-22 support
is not yet released. We start on Angular 22 with CDK + Tailwind for the minimal early chrome. **The
first time we need heavy components (rich tables/forms): if PrimeNG 22 is out, adopt it; if not,
brief wait or interim CDK.** Keep component usage behind **thin wrappers** so the swap is contained.

Full rationale and alternatives considered: [`docs/decisions.md`](docs/decisions.md).

---

## 4. Architecture rules (the spine)

The system is built as small units, each with one responsibility and a clear interface
(full list in [`docs/vision.md`](docs/vision.md) §pillars). The rules that must never be broken:

1. **The engine-adapter rule.** `MapLibre`, `deck.gl`, and `WeatherLayers` may be imported **only**
   inside `src/app/engine/`. Nothing else in the app touches them. This is the lock-in hedge and
   the junior boundary. If you need a map capability elsewhere, expose it through the adapter.
2. **A layer is a declarative definition, not engine code.** Adding a weather layer = adding a
   *definition* (id, type, data source, style/colormap, temporal behavior, defaults) to the layer
   registry. The adapter turns definitions into rendered layers. (Definition v1 in Slice 0;
   finalized with the registry in Slice 1.)
3. **All values flow through the Units module.** No raw numbers rendered anywhere (hover, tables,
   charts, readouts) without going through unit conversion/formatting.
4. **All coordinates/time flow through the Geo module.** Lat/Lon, DMS, MGRS, and Zulu/Local are
   formatted in one place, never ad-hoc.
5. **State lives in signal-stores**, one per domain (e.g. time, layers, warnings). Components read
   signals and call store methods; they don't hold cross-cutting state.
6. **RTL by construction.** Use CSS logical properties (`margin-inline`, `inset-inline`, etc.) and
   `dir`-aware components — never hard-code left/right.

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
    home/             # the front page: the map view
  engine/             # rendering machinery — ONLY place importing maplibre/deck.gl/weatherlayers
    renderers/        # one file per render style (colormap, particles; later contours, barbs…)
  layers/             # THE CATALOG: one file per layer, grouped by content category
    model/            # layers fed by numerical weather models (temperature, wind, …)
  types/              # backend data contracts (DAO shapes); area-specific interfaces colocate
  utils/              # pure functions; similar functions share a file, split when grown
  settings/           # injectable settings stores
  dev/                # QUARANTINE: spike/demo/diagnostics — never imported by product code
public/               # static assets (Angular 22 convention; served from /)
  basemaps/           # self-hosted styles + tiles (vendored)
  fonts/              # self-hosted Hebrew+Latin font
  fixtures/           # sample data in the real backend formats
  icons/
```

Future domain folders (units, geo, warnings, charts, reporting, theming — see vision §pillars) are
added when their slice arrives, following the same hybrid rule. Adding a model layer of an existing
render style = exactly one new file in `layers/model/`.

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
  must never import from `dev/`; only page templates may mount dev widgets.
- **Naming:** descriptive, no abbreviations a junior wouldn't know. One concept = one name everywhere.
- **Files stay small and focused.** If a file is doing two things, split it. (Old codebase pain.)
- **Styling:** Tailwind utilities for layout/spacing; design tokens for color/typography; logical
  properties for direction. No magic numbers — use tokens.
- **Thin wrappers:** wrap CDK/PrimeNG components in our own `shared/` components so swaps and
  RTL/theme concerns are handled in one place.
- **No code comments yet** (see §2).

> Where a convention is not yet chosen, it is decided during the relevant slice and then **locked
> here**. Do not invent a second way.

---

## 7. Dependency policy (offline / vendored)

- The runtime network is **internal-only** and there is **no package registry inside**. Dependencies
  are **vendored/offline** and hand-carried in. **Adding a dependency is a deliberate act.**
- **Dependency budget:** prefer few, popular, clean-dep-tree libraries. Before adding anything:
  1. Confirm it's truly needed and nothing we have already covers it.
  2. Check its transitive tree and that it has **no runtime phone-home** (no CDN/telemetry).
  3. Get user sign-off, then vendor it (procedure to be documented in Slice 0).
- Self-host **everything**: fonts, icons, basemap tiles/styles, all assets. No CDNs, no Cesium ion,
  no Mapbox.

---

## 8. Performance budget (enforced)

- Target **60 fps** with **≤ 5 layers + 1 animation** on an **integrated GPU @ 1080p** (4K only on
  stronger hardware; resolution scales with the machine).
- **Adaptive quality knobs** (particle counts, texture caps) + a dev-toggleable **perf HUD**
  (FPS/memory) ship from Slice 0 — the target fleet isn't directly testable, so tuning is config-only.
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

- **Product vision & full capability list:** [`docs/vision.md`](docs/vision.md)
- **Technical decisions & rationale:** [`docs/decisions.md`](docs/decisions.md)
- **Roadmap (slices):** [`docs/roadmap.md`](docs/roadmap.md)
- **Domain knowledge:** [`docs/domain/`](docs/domain/) (meteorology, units/coordinates/time)
- **Per-slice specs:** [`docs/specs/`](docs/specs/)

---

## 11. Current status

**Slice 0 complete (2026-06-10): scaffold, shell, basemaps, engine adapter v1, fixtures, spike —
go/no-go = GO** (see the spike-result section in [`docs/decisions.md`](docs/decisions.md)).
**Next: Slice 1 — globe + first layers + time + hover.** Spec to be written per
[`docs/roadmap.md`](docs/roadmap.md); plan template in
[`docs/plans/`](docs/plans/).
