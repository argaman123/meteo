# Technical Decisions & Rationale

Decisions are **locked** unless explicitly revisited with the user. Each entry: the decision, and
why. Consistency depends on not silently re-opening these.

## Decision log

| Area | Decision | Why |
|---|---|---|
| **Rendering engine** | **MapLibre GL JS (globe) + deck.gl + WeatherLayers GL**, behind an **engine adapter** | Most popular/learnable, highest feature ceiling (custom WebGL layers), lightest on 8 GB RAM, best vector-basemap style presets, best RTL labels |
| **3D model** | "Globe as canvas" (MapLibre globe, stable since v5.0, Jan 2025) | User reads data near-top-down; tilt/terrain not central; lighter than Cesium |
| **Renderer reuse** | **Rebuild** on deck.gl/WeatherLayers — no porting | Old code can't leave the closed network; the old app is a behavioral reference via the lead's photos/descriptions (layer catalog, palettes, routes extracted as sanitized text) |
| **Field data delivery** | **Whole-grid encoded textures** (WeatherLayers-native equirectangular PNG/GeoTIFF). Day one: client converts the backend's existing **JSON grids** to textures. A pre-encoded-grid endpoint is the one **additive** backend ask, when justified. **Tiles only if deep zoom ever demands** | Backend serves JSON + satellite PNGs today, never tiles; a global 0.25° grid ≈ 1 MB PNG (~10× smaller than JSON, no parse cost); hover readouts read the texture client-side either way |
| **Viewport-windowed requests** | For **model parameters**, the real backend serves **only the currently visible area** per request (bbox-windowed grids), not the whole domain. The Slice-1+ data-access layer requests by bbox as the camera moves | Lead 2026-06-10 — design the data layer and its `dev/` HTTP mock around bbox requests from day one |
| **Basemap** | ArcGIS = background ground **only**; + self-hosted local styles (dark/light/colorful) | ArcGIS is an Esri shop standard; local styles are the fast/uncluttered fallback |
| **Real-time** | **Polling** (no WebSocket/SSE) | Matches how fresh the data needs to be; simpler |
| **Framework** | **Angular 22** now + **Angular CDK** + **Tailwind**; add **PrimeNG 22** when it ships | Only PrimeNG is Angular-version-coupled; early chrome needs little of it |
| **State** | **Signals + small injectable signal-stores** | Most junior-readable; matches zoneless/signals-first Angular 22 |
| **i18n** | **No translation framework**; author each element in its language; **bidi/RTL mandatory** + self-hosted Hebrew+Latin font | User: "some elements Hebrew, some English, by user" — no live toggle, but mixed direction is always present |
| **Theming** | Design tokens → Tailwind + (later) PrimeNG token theme; presets = declarative config | Presets without code forks; bounded |
| **Auth** | **Open / network-trusted** (no login, no roles) | Being on the network is the gate ⇒ preferences are device-local |
| **Testing** | **Light/manual** + strict TypeScript + ESLint/Prettier; **Vitest tests for pure units/geo/time logic** | Architecture is the safety net; unit/coordinate conversions are pre-known bite points — a silent kt↔m/s or MGRS error is an operational hazard |
| **Rendering mode** | Client-side **SPA, no SSR** | WebGL needs the browser |
| **Network/deps** | Internal-only runtime; **dependencies vendored/offline**; strict dependency budget | No registry inside; self-host everything |
| **Migration** | Separate new app; **route-by-route cutover** behind a reverse proxy | No embedding the old Angular 10 app |
| **Devices** | Desktop (primary) + control-room/wall; no phone/tablet | Desktop-dense, high-DPI, multi-monitor |
| **Performance** | 60 fps with ≤ 5 layers + 1 animation on iGPU @ 1080p; adaptive quality knobs + perf HUD from Slice 0; match-or-beat current Cesium | Hardware is mixed-fleet 8 GB mini-PCs; resolution scales with the machine |
| **Browser floor** | **Chrome 112** (fleet-pinned), enforced via `browserslist`; **Chrome-for-Testing 113 smoke test** in Slice 0 | Fleet runs Chrome 112 — below Angular 22's official baseline (~30-month window), but it has WebGL2 + full ES2022 and clears Tailwind v4's Chrome-111 floor. Accepted, *measured* risk; confirm version with IT and ratchet at cutover |
| **Basemap assets** | **Protomaps PMTiles** + open styles (dark/light/+), fully self-hosted; vendor the **RTL text plugin**; verify **Hebrew glyph ranges** | Single-file tiles suit the offline rule; MapLibre renders Hebrew labels only via the separate `@mapbox/mapbox-gl-rtl-text` plugin (examples CDN-load it — banned here); map glyphs are PBF ranges, separate from the UI font |
| **Spike validation** | Best-effort outside measurement + **reasoned assessment**; adaptive knobs + perf HUD are the insurance | No access to target mini-PCs for real checks — tuning must be possible via config alone |
| **UI font** | **Heebo** (variable, self-hosted; vendored from `@fontsource-variable/heebo`) | Lead-approved 2026-06-10; Hebrew-first design, single family for Hebrew+Latin, OFL |
| **Default theme** | **Dark** default; dark + light + colorful(terrain) basemap styles all ship in Slice 0 | Lead: control-room/weather-viz norm; semi-transparent data layers must read well on all three |
| **Slice-0 fixtures** | **Generated by us** to the lead's format spec (grid JSON: metadata + `units` + 2D `values`, row 0 = north; obs: `{lat,lon,value}[]`; satellite: one public-domain PNG fetched once) | Lead amended the "lead supplies files" input 2026-06-10: closed-network originals can't leave; he validates shape against the real backend |
| **Wind delivery** | Separate **speed** and **direction** (met. degrees, "from") grids, computed by the backend from u/v; units vary per grid (e.g. speed in **knots**) so grid JSON carries a `units` field (to verify); client converts and re-derives u/v | Matches the real backend per lead 2026-06-10 |
| **Routing scope** | **Front page only** for now (`/map`); cutover route map deferred until the lead supplies the old app's page list | Lead 2026-06-10: front page is the dominant page; other pages much later |
| **Unit tests** | **None committed for now** (amends the Testing decision): temporary Vitest checks verify hazard logic during development, then are deleted | Lead 2026-06-10; conversion correctness stays a flagged hazard — revisit when Units/Geo modules land |
| **Basemap artifacts** | **Prebuilt only**: Protomaps daily-build extract + downloaded prebuilt styles (maps.protomaps.com) + prebuilt Natural Earth hypso/relief raster tiles converted to PMTiles | Lead 2026-06-10: don't build tiles/styles ourselves |

## Engine alternatives considered (and why not)

- **Mapbox GL** — licensing + phones home → fails the offline rule.
- **Leaflet / OpenLayers** — no GPU particles / no real globe.
- **deck.gl `GlobeView` as the primary engine** — officially **experimental** (no tilt, no precision
  past ~zoom 12, TileLayer/MVT experimental).
- **CesiumJS** — the runner-up; best *true* 3D globe, but heavier on 8 GB RAM and mismatched to
  "globe as canvas + rich 2D-style data layers + vector style presets." Re-open only if immersive 3D
  (tilt/terrain/flythrough) becomes central.
- **Esri ArcGIS Maps SDK as the app engine** — explicitly **not** used; ArcGIS is basemap ground only.

**WeatherLayers GL** note: open core is MPL-2.0 (fine for internal use, self-hostable via npm),
provides Raster/Contour/HighLow/Grid/Particle layers, and is **multi-engine** (deck.gl/MapLibre/
ArcGIS) — which further hedges lock-in. Verified 2026-06-10: dual-licensed (MPL-2.0 or commercial
terms); MapLibre-globe support requires **MapLibre ≥ 5.0** with **deck.gl 9.1** as peer; native
input is **whole equirectangular images** (PNG/WebP/GeoTIFF Float32; vector data as 2-band u/v).

## The lock-in hedge (user's #1 fear: switching libraries in a year)

1. **Engine-adapter boundary** — MapLibre/deck.gl/WeatherLayers imported only in `map/engine/`.
2. **Declarative layers** — the app describes layers; the adapter renders them.
3. WeatherLayers being multi-engine means even weather layers stay portable.

## PrimeNG / Angular-22 checkpoint

As of June 2026, latest PrimeNG is **21.x (Angular 21 only)**; Angular-22 support is requested but
unreleased. Plan: build early chrome on **CDK + Tailwind**, wrap components thinly, and adopt
**PrimeNG 22** the first time heavy components (rich tables/forms) are needed — if it's out by then;
otherwise brief wait or interim CDK. Also evaluate **Angular Aria** at the checkpoint (stable in
v22; official headless accessible patterns) — it may shrink the heavy-component need.

## Slice 0 spike result (2026-06-10) — **GO**

The engine spike (temperature colormap + animated wind particle layer from fixture grids, rendered
via WeatherLayers GL 2026.5.2 / deck.gl 9.3.3 interleaved on the MapLibre GL 5.24 globe) was
measured on the production build (`ng build`, served statically) per the Slice 0 spec.

**Hardware (dev machine — best-effort proxy, no target-fleet access):** i7-12700, 16 GB RAM,
rendering on **NVIDIA T400 4 GB** (entry-level discrete; same broad class as a good integrated GPU,
but not identical — the machine's Intel UHD 770 was not the adapter Chrome picked). Window
~1327×1243 (~1.65 MP, near-1080p).

| Scenario | Result |
|---|---|
| 7.8 min continuous animation + churn (forecast-hour switch every 40 s, basemap switch every 2 min, globe↔2D toggle every ~2.7 min), default knobs (5 000 particles / 2048 texture cap) | **60 fps constant** (min = avg = max = 60 across 48 samples) |
| Heap over the same run | 34–107 MB oscillating with GC, **ended lower than it started** (83 → 38 MB) — no leak/creep |
| Knobs at maximum (20 000 particles / 4096 cap) | 51 fps — knobs measurably matter |
| Knobs at minimum (1 000 particles / 512 cap) | 60 fps — scale-down works |
| **Chrome-for-Testing 113.0.5672.63** (browser-floor proxy for fleet Chrome 112) | App boots, globe + all basemaps + both data layers render, HUD reports **60 fps**, **zero console/page errors** (verified via CDP) |
| 2D ↔ globe | Both data layers render correctly in both projections; layers survive basemap `setStyle` |
| Hebrew/RTL | Hebrew labels render correctly (vendored RTL plugin + glyph range 1280-1535) in app UI and map labels |

**Reasoned assessment vs the §8 budget (60 fps, ≤5 layers + 1 animation, iGPU @ 1080p):** the spike
ran 2 layers + 1 animation at a locked 60 fps with large headroom (heap < 110 MB, 51 fps even at 4×
the default particle load) on a GPU roughly one class above the target iGPUs. The quality knobs
demonstrably trade load for fps and persist per-PC, which is the designed mitigation for the
unmeasurable fleet. Browser-floor risk is retired for this stack (CfT 113 clean). **Decision: GO —
proceed to Slice 1 on MapLibre + deck.gl + WeatherLayers.** Residual risk: true iGPU + 8 GB-RAM
behavior is still unverified; re-measure on a representative mini-PC at first opportunity inside
(the perf HUD ships with the app — Ctrl+Alt+P or `?hud=1`).

## Open items to confirm (non-blocking)

- **Backend contract:** field-grid JSON shapes (lead provides fixture files in the exact real
  formats + decode notes); available layers/levels; latest-cycle polling; warnings feed shape;
  decoded-obs & summary endpoints; point time-series (meteogram), vertical soundings (Skew-T), and
  cross-section extraction endpoints; the additive pre-encoded-grid endpoint (see Field data delivery).
- **Search & locate data source** — what does the old app's search use? (An offline place index is
  needed somewhere.)
- **Fleet Chrome version** — confirm with IT; ratchet the browser floor at cutover.
- **Layer catalog & color palettes** — extracted from the old app as sanitized text/photos when each
  slice needs them.
- **UI font** — decided in Slice 0 (leading candidate: **Heebo**; alternative: Noto Sans + Noto Sans
  Hebrew pair).
- **PrimeNG 22 availability** at the checkpoint.
