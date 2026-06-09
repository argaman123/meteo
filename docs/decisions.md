# Technical Decisions & Rationale

Decisions are **locked** unless explicitly revisited with the user. Each entry: the decision, and
why. Consistency depends on not silently re-opening these.

## Decision log

| Area | Decision | Why |
|---|---|---|
| **Rendering engine** | **MapLibre GL JS (globe) + deck.gl + WeatherLayers GL**, behind an **engine adapter** | Most popular/learnable, highest feature ceiling (custom WebGL layers), lightest on 8 GB RAM, best vector-basemap style presets, best RTL labels |
| **3D model** | "Globe as canvas" (MapLibre globe, stable since v5.0, Jan 2025) | User reads data near-top-down; tilt/terrain not central; lighter than Cesium |
| **Renderer reuse** | **Hybrid** — ready-made deck.gl/WeatherLayers layers; port the existing custom canvas renderer only for perf-critical/special layers | Existing system already "draws a layer canvas and composites over the globe" — maps onto a deck.gl overlay |
| **Field data delivery** | **Encoded data tiles (Windy-style)** | Enables client-side colormaps/contours/particles and cheap hover readouts |
| **Basemap** | ArcGIS = background ground **only**; + self-hosted local styles (dark/light/colorful) | ArcGIS is an Esri shop standard; local styles are the fast/uncluttered fallback |
| **Real-time** | **Polling** (no WebSocket/SSE) | Matches how fresh the data needs to be; simpler |
| **Framework** | **Angular 22** now + **Angular CDK** + **Tailwind**; add **PrimeNG 22** when it ships | Only PrimeNG is Angular-version-coupled; early chrome needs little of it |
| **State** | **Signals + small injectable signal-stores** | Most junior-readable; matches zoneless/signals-first Angular 22 |
| **i18n** | **No translation framework**; author each element in its language; **bidi/RTL mandatory** + self-hosted Hebrew+Latin font | User: "some elements Hebrew, some English, by user" — no live toggle, but mixed direction is always present |
| **Theming** | Design tokens → Tailwind + (later) PrimeNG token theme; presets = declarative config | Presets without code forks; bounded |
| **Auth** | **Open / network-trusted** (no login, no roles) | Being on the network is the gate ⇒ preferences are device-local |
| **Testing** | **Light/manual** + strict TypeScript + ESLint/Prettier | Architecture (types, small units, adapter boundary) is the safety net; add tests where bugs bite |
| **Rendering mode** | Client-side **SPA, no SSR** | WebGL needs the browser |
| **Network/deps** | Internal-only runtime; **dependencies vendored/offline**; strict dependency budget | No registry inside; self-host everything |
| **Migration** | Separate new app; **route-by-route cutover** behind a reverse proxy | No embedding the old Angular 10 app |
| **Devices** | Desktop (primary) + control-room/wall; no phone/tablet | Desktop-dense, high-DPI, multi-monitor |
| **Performance** | 60 fps with ≤ 5 layers + 1 animation on iGPU @ 1080p; adaptive particles; match-or-beat current Cesium | Hardware is mixed-fleet 8 GB mini-PCs; resolution scales with the machine |

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
ArcGIS) — which further hedges lock-in.

## The lock-in hedge (user's #1 fear: switching libraries in a year)

1. **Engine-adapter boundary** — MapLibre/deck.gl/WeatherLayers imported only in `map/engine/`.
2. **Declarative layers** — the app describes layers; the adapter renders them.
3. WeatherLayers being multi-engine means even weather layers stay portable.

## PrimeNG / Angular-22 checkpoint

As of June 2026, latest PrimeNG is **21.x (Angular 21 only)**; Angular-22 support is requested but
unreleased. Plan: build early chrome on **CDK + Tailwind**, wrap components thinly, and adopt
**PrimeNG 22** the first time heavy components (rich tables/forms) are needed — if it's out by then;
otherwise brief wait or interim CDK.

## Open items to confirm (non-blocking)

- **Current custom renderer:** WebGL vs 2D canvas? reprojected to globe or flat overlay? draws
  colormaps, particles, or both? (Determines how much to port.)
- **Local basemap format:** vector tiles (cheap dark/light/colorful style swaps) vs raster (separate
  styled sets). Confirm what is self-hostable.
- **Backend contract:** encoded-tile endpoints, available layers/levels, latest-cycle polling,
  warnings feed shape, decoded-obs & summary endpoints.
- **PrimeNG 22 availability** at the checkpoint.
