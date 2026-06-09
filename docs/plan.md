# Consolidated Plan (Approved 2026-06-09)

> Single-file consolidated plan, kept in the repo for backup and easy skimming.
> The **living** versions are split across [`../CLAUDE.md`](../CLAUDE.md) and [`./`](.) (see
> `CLAUDE.md` §10 "Where things live") — make ongoing edits **there**, not here. This file is the
> approved planning **snapshot**: a point-in-time record, not a document to keep continuously synced.
>
> **Status:** Planning complete; foundation docs created and committed. **Next: Slice 0**
> (see [`specs/slice-0.md`](specs/slice-0.md)).

---

## 1. Context

A meteorological visualization platform (Windy-like but specialized) built over ~6 years by
~25 rotating junior developers on **Angular 10**, never upgraded, now thousands of messy files.
Backend is being rebuilt in **Python** (old Spring Boot backend still serves the current site and
is stable). Task: **rebuild the entire frontend from zero**, solo (senior dev / team lead), over
~4 months, using Claude Code daily.

**Top goals (in priority order):**
1. **Handoff-ability & junior-readability.** No hard deadline — *"if I don't finish it, someone
   else will."* So the code, conventions, and docs must let a different person / a non-web junior
   pick it up cold and stay consistent. This is co-equal with "it works."
2. **Runs well for everyone**, incl. low-end **8GB mini-PCs with integrated GPUs**.
3. **Looks great and absorbs new features for years.**

---

## 2. How we work together (operating rules)

- **Always plan → approve → build.** Every non-trivial task gets a short spec + user sign-off
  before code. Ask many questions up front; verify often; **don't fragment small tasks** into
  many micro-steps; **don't assume** — verify even when fairly sure.
- **Consistency is law.** Be creative when *choosing* a pattern; once chosen it becomes the
  standard and is applied everywhere, so juniors copy the established pattern. Never drift.
- **Persist everything to `.md`.** All decisions and gathered domain knowledge go into this plan /
  specs / `docs/domain/*` / `CLAUDE.md`. Nothing lives only in chat. Resumable anywhere.
- **No code comments for now.** Structure + docs carry meaning; revisit comments later.
- **Knowledge intake:** mostly iterative, from the user's head as we build, plus occasional
  **unclassified** phone photos. Treat all domain info as sensitive — never push for classified detail.
- **CLAUDE.md is very prescriptive** (explicit rules, recipes, do/don't) — but leaves room for
  creative pattern selection, after which the pattern is fixed.
- **Design principle:** *function & data-completeness first, polish second.* Modern/clean default,
  but never hide a needed value for a prettier layout — "as nice as the need allows."

---

## 3. Product vision

A **pure viewer/consumer** platform (NOT an authoring tool — weathermen author polygons & tables
in a separate app; this app displays the published products + model data + observations).

**Users:** wide spectrum — Defense/military · Aviation & maritime · Emergency & public · **casual**.
One shared deployment for all; per-group differences ride on **presets/config**, not roles/login.

**Why it exists (all four):** proprietary/regional data · domain-specific tools · integration with
internal systems · runs inside a closed/secure network. ⇒ architecture must be an **extensible
framework for many domain tools and data types**, not a fixed app.

**Dominant usage:** explore layers over a region · point/location forecasts · always-on
**situational monitoring** (walls) · **briefing & decision support** (go/no-go).

---

## 4. Complete product scope (capability inventory)

| Capability | Detail |
|---|---|
| **Globe + 2D toggle** | 3D sphere default ("globe as canvas"), one-line 2D toggle. Tilt/terrain not central |
| **Basemaps** | ArcGIS = background ground ONLY; + self-hosted local basemap with **dark / light / colorful** styles — a fast, uncluttered fallback for when the ArcGIS server is slow or the satellite view is too cluttered |
| **Layer types** | colormap fills · animated particles · contours/isolines · wind barbs/arrows · raster (satellite/radar loops) · station/point obs (icons + values) · **RTL text labels** · polygons (incl. warning polygons) · lines/paths. All composite with order + opacity |
| **Field data** | **Encoded data tiles (Windy-style)** — client renders colormaps/contours/particles in WebGL |
| **Level selector** | surface + pressure levels + **heights in kilofeet** (aviation) |
| **Time controller** | global, central; **real-time + forecast + history**; scrubber + playback; **polling** for latest cycles; per-layer availability windows |
| **Hover readout** | on by default (toggleable): text tooltip of **all active layers' values** at the cursor (cheap because encoded tiles already hold values) |
| **Click → detail panel** | user **chooses** which outputs: **meteogram · vertical sounding (Skew-T) · raw values · cross-section along a line** — never all at once |
| **Map tools** | draw/measure (distance/area), define cross-section line, define AOI; **search & locate** (places, coords) |
| **Coordinates** | Lat/Lon (decimal + **DMS**) · **MGRS / military grid** (input, display, **grid overlay**) |
| **Time display** | **UTC/Zulu + Local** (dual) |
| **Units (switchable)** | wind kt & m/s · temp °C & °F · distance/altitude NM/km/ft/**kilofeet** · pressure hPa/mb & inHg. Cross-cutting module used by hover, tables, charts, queries |
| **Warnings subsystem** | **sidebar** listing current + near-future warnings for areas of interest (text + green/yellow/red status) · warning **polygons as a globe layer** · **active notifications** on new/changed warnings (polling) |
| **Tables / reports** | tabular forecasts · decoded observations (METAR/TAF/synoptic) · auto text summaries · custom reports/briefings (*later*) |
| **Output** | **screenshot-first** (users screenshot globe/tables manually) + existing **"frame AOI" button** (auto-animate globe → switch to 2D → zoom to AOI). PDF/print + data export = *later* |
| **AOIs** | **predefined per group** + **user-defined on the fly** |
| **Dashboard / wall mode** | always-on situational view for control-room walls |
| **Presets / theming** | design-token-driven; **modern/clean default** + "classic/old-look" toggle (the *minimum* viable) + per-group (e.g. Navy) + possibly custom; **bounded — never at the cost of maintainability** ("no one asked for it"); preset stored in **localStorage, one per PC** (subsumes "pinned layers") |
| **UI/UX approach** | adaptive UI: simple & useful by default, with **grouped advanced controls** surfaced for specific user groups; allow light per-user tweaks (e.g. pin layers). **UX needs its own dedicated design pass** — not yet designed |

---

## 5. Domain & data conventions

- **Data sources:** global models + **regional high-res model** + **observations** (radar/sat/
  stations/lightning). Coverage usually **global, auto-switches to a better/regional model on
  zoom-in**; resolution consistent.
- **Vertical:** surface + pressure levels + heights in **kilofeet**.
- **Coordinates/time:** Lat/Lon (decimal + DMS), **MGRS**, **Zulu + Local** — all required.
- **Real-time transport:** **polling** (no WebSocket/SSE).

---

## 6. Locked technical decisions

| Area | Decision | Notes |
|---|---|---|
| **Engine** | **MapLibre GL JS (globe) + deck.gl + WeatherLayers GL**, behind an **engine adapter** | Most popular/learnable, highest feature ceiling, lightest on 8GB, best vector-basemap presets & RTL labels |
| **3D model** | "Globe as canvas" — MapLibre globe (stable v5.0+) | Lighter than Cesium; ideal for the data-layer-rich, near-top-down use |
| **Renderer reuse** | **Hybrid** — ready-made deck.gl/WeatherLayers layers; port existing custom canvas renderer only for perf-critical/special layers | Existing system "draws layer canvas, composites over globe" maps onto deck.gl overlay |
| **Network** | **Internal-only** at runtime; **vendored/offline** deps (no registry) | Self-host everything; strict **dependency budget**; deliberate, hand-carried additions |
| **Migration** | Separate new app; **route-by-route cutover** behind a reverse proxy | No embedding old code |
| **Framework** | **Angular 22 now** + **Angular CDK** + **Tailwind**; **add PrimeNG 22 when it ships** | Only PrimeNG is version-coupled (PrimeNG 21 = Angular-21-only as of Jun 2026). Early chrome via CDK; thin wrappers so the swap is contained. Checkpoint: adopt PrimeNG when first needing heavy components |
| **State** | **Signals + small injectable signal-stores** per domain | Most junior-readable; matches zoneless/signals-first Angular 22 |
| **i18n** | **No translation framework**; each element authored in one language. **Bidi/RTL mandatory** (logical CSS, `dir`-aware, RTL map overlays) + self-hosted **Hebrew+Latin font** | "Some elements Hebrew, some English, by user" |
| **Theming** | **Design tokens** → PrimeNG token theme + Tailwind; presets = **declarative config** | Bounded; no code forks |
| **Auth** | **Open / network-trusted** (no login, no roles) | ⇒ preferences device-local |
| **Testing** | **Light / manual** + strict TypeScript + ESLint/Prettier | Architecture (types, small units, adapter boundary) is the safety net |
| **Rendering** | Pure **client-side SPA, no SSR** | WebGL needs the browser |
| **Perf budget** | 60fps with **≤5 layers + 1 animation** on **iGPU @ 1080p** (4K only where HW is stronger); adaptive particle counts; **match-or-beat current Cesium** | Resolution scales with hardware |
| **Devices** | Desktop (primary) + control-room/wall. No phone/tablet | Desktop-dense, high-DPI |

**Engine rationale (brief):** ruled out Mapbox (licensing/phones-home), Leaflet/OpenLayers (no GPU
particles/globe), deck.gl `GlobeView` as primary (experimental). Cesium = runner-up but heavier on
8GB and mismatched to "globe as canvas + rich 2D-style layers + vector style presets." WeatherLayers
GL (MPL-2.0 open core, self-hostable) provides Raster/Contour/HighLow/Grid/Particle layers and is
**multi-engine** (deck.gl/MapLibre/ArcGIS) — doubly hedges lock-in.

---

## 7. Architecture pillars (each = one unit, clear responsibility, well-defined interface)

1. **App Shell & Routing** — outer frame; route map designed for route-by-route cutover; SPA, no SSR.
2. **Map Engine Adapter** — wraps MapLibre + deck.gl. **Nothing else imports them directly.** The
   lock-in hedge and the junior boundary.
3. **Layer System (declarative registry)** — each layer = a declarative definition (id, type, data
   source, style/colormap, temporal behavior, defaults). **Add a layer = add a definition**, not engine code.
4. **Global Time Controller** — signal-store; live/forecast/history; playback; polling latest cycles.
5. **Data Access Layer** — typed backend clients (polling); model-switch by zoom; encoded-tile,
   obs, and warnings endpoints; ArcGIS basemap config. **Adapt to existing contract; request only
   *additive* endpoints.**
6. **Units Module** — switchable conventions; every readout/table/chart flows through it.
7. **Coordinate & Grid Subsystem** — lat/lon, DMS, MGRS (display + input), grid overlays; dual Zulu/local time.
8. **Interaction Layer** — hover readout (all active layers) + click detail panel (meteogram /
   sounding / cross-section / values) + map tools (draw/measure/AOI/search).
9. **Warnings Subsystem** — sidebar (text + traffic-light) + polygon layer + active notifications.
10. **Charts Subsystem** — meteogram, Skew-T sounding, cross-section.
11. **Reporting & Tables** — tabular forecasts, decoded obs, auto summaries; screenshot-first +
    "frame AOI" action; PDF/export later.
12. **Theming & Preset System** — tokens; modern default + classic + per-group; localStorage one-per-PC.
13. **Dashboard / Wall Mode** — always-on situational view.
14. **Quality & Performance discipline** — perf budget; vendoring discipline; strict TS + ESLint/
    Prettier; no code comments for now; **consistency-is-law**.

---

## 8. Decomposition into slices (each gets its own spec → plan → build)

- **Slice 0 — Foundation & spike** ⭐ *(start here)*: scaffold Angular 22 (zoneless, signals,
  Vitest) + Tailwind + Angular CDK; project structure; design tokens + default theme; **project
  `CLAUDE.md`** + `docs/domain/*`; vendored-deps workflow; app shell + routing; **engine adapter** +
  self-hosted basemap on a globe with 2D toggle; **iGPU spike** (particles + colormap from encoded
  tiles → go/no-go on the engine).
- **Slice 1 — Globe + first layers + time + hover (core MVP)**: layer registry + 1–2 encoded-tile
  layers (colormap + wind particles); global time controller + scrubber; layer on/off/opacity/order;
  **hover readout**; basemap presets; **"frame AOI" button**.
- **Slice 2 — Full layer system + panel + levels**: more layer types (contours, stations, polygons
  incl. warnings, RTL labels, radar loops); layer management panel; **level selector**; legends.
- **Slice 3 — Interaction & domain depth**: click **detail panel** (meteogram / sounding / cross-
  section / values); **map tools** (draw/measure/search); **coordinate & grid** (MGRS/DMS, grid
  overlay); **units module** surfaced everywhere; **warnings sidebar + notifications**.
- **Slice 4 — Presets/theming + dashboard mode**: preset system (modern + classic + per-group) +
  localStorage; control-room/wall dashboard mode.
- **Later — feature pages (route-by-route cutover)**: tables/reports subsystem (tabular forecasts,
  decoded obs, summaries), export/print, and the remaining pages.

*(Units & coordinate display are cross-cutting; their basics may be pulled earlier as needed.)*

**First build = Slice 0 + Slice 1.** Slice 0 front-loads the one real risk (particles on a baseline iGPU).

---

## 9. Project `CLAUDE.md` outline (realized — see `../CLAUDE.md`)

- **Mission & non-negotiables**: handoff-ability/junior-readability · runs on 8GB iGPU · offline/vendored.
- **How we work**: plan→approve→build · consistency-is-law · persist-to-md · no-comments-for-now.
- **Tech stack & versions** (+ Angular-22 / PrimeNG-later note + checkpoint).
- **Architecture map**: the 14 pillars + the **engine-adapter rule** ("never import MapLibre/deck.gl
  outside the adapter") + the **layer-definition recipe** ("how to add a layer" — the top junior task).
- **Conventions**: standalone components · signals + signal-stores · naming · file/folder layout ·
  thin component wrappers · CSS logical properties for RTL · units always via the units module.
- **Dependency policy**: dependency budget + the vendored/offline add-a-package procedure.
- **Performance budget** + how to check it.
- **Anti-patterns** from the old codebase to avoid.

---

## 10. Open items to confirm (non-blocking)

- **Current custom renderer**: WebGL vs 2D canvas? reprojected to globe or flat overlay? draws
  colormaps, particles, or both? (How much to port.)
- **Local basemap format**: **vector** tiles (dark/light/colorful = cheap style swaps) vs **raster**
  (needs separate styled sets). Confirm what is self-hostable.
- **Backend contract specifics**: encoded-tile endpoints, available layers/levels, latest-cycle
  polling, warnings feed shape, decoded-obs & summary endpoints.
- **PrimeNG 22 availability** at the point heavy components are first needed (checkpoint).

---

## 11. Verification (per slice)

- Run locally; confirm globe + basemap presets render on a baseline-iGPU profile.
- Slice 0 spike: measure particle + colormap FPS/memory on 8GB iGPU @1080p vs the perf budget.
- Slice 1: scrub time across live/forecast/history; toggle layers/opacity/order; hover readout shows
  all active layers; confirm match-or-beat current Cesium responsiveness; RTL spot-check (Hebrew).
- Lint + typecheck clean; manual smoke of key flows.
