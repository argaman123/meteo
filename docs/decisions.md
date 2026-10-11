# Technical decisions

Locked unless the lead reopens them. Each: the decision and why.

| Area | Decision | Why |
|---|---|---|
| Framework | Angular 22 — standalone, zoneless, signals-first; client-side SPA, no SSR | Current Angular; WebGL needs the browser |
| State | One `@Service` per domain holding its signals + the methods that change them; no NgRx, no stores layer | The mainstream Angular pattern (cf. ngx-maplibre-gl's MapService); one inject per domain |
| Map engine | MapLibre GL + deck.gl (interleaved), first-party looks, all behind `engine/` | Popular and learnable, light on 8 GB machines, custom WebGL headroom; the boundary is the lock-in hedge |
| Weather rendering | First-party looks on deck.gl primitives (WeatherLayers GL removed 2026-06) | Customization, readability, no vendor risk — a vendor globe bug drew false data |
| Globe / 3D | Flat by default; globe as a setting (deck 9.4 + `@deck.gl/maplibre`, depth and culling overridden per layer); no 3D terrain/pitch | Every look checked on the globe; flat stays the solid floor |
| Components | spartan/ui (brain from npm + Helm copied into `src/spartan/`) on CDK + Tailwind | shadcn model: in-repo code, junior-readable, RTL/theme-fixable, trivially vendored |
| Styling | Tailwind utilities + spartan's CSS-variable theme; dark default | Control-room norm; one color system |
| i18n | No translation framework; each element authored in its language; bidi/RTL mandatory | Mixed Hebrew/English per element, no live toggle |
| Font | Source Sans 3 (Latin/digits) + Heebo (Hebrew), self-hosted | Lead-picked look; Heebo's Latin read as default |
| Units / Geo | One Units module (`convert`/`format(value, Quantity, fromUnit)`, display unit resolved centrally, settings-driven where the lead allows) and one Geo module | Wrong conversions are an operational hazard; one place to get right |
| Time | Local time only; ms end to end; seconds only on the wire | One unit, no Zulu (lead) |
| Data delivery | Polling, no WebSocket/SSE; bbox-windowed model grids; JSON Wraps; satellite PNGs | Matches the backend and freshness needs |
| Auth | None — network-trusted; preferences per device (localStorage) | Being on the network is the gate |
| Testing | Light/manual + strict TypeScript + ESLint/Prettier; no committed unit tests — temporary Vitest checks for hazard logic, then deleted | Lead's call; conversion correctness stays a flagged hazard |
| Browser floor | Chrome 112 (fleet-pinned), `browserslist`-enforced | Fleet constraint; WebGL2 + ES2022 are there |
| Performance | 60 fps with ≤ 5 layers + 1 animation on an integrated GPU at 1080p; quality knobs + perf HUD; looks never capped globally for weak PCs | Mixed fleet of 8 GB mini-PCs we can't test on |
| Dependencies | Use good libraries freely during development; at cutover audit (transitive, no phone-home) and vendor everything; runtime assets self-hosted (fonts, icons, basemaps) | Delivery target is a closed network |
| Geo geometry | Turf.js modules (`@turf/*`) per feature; hot loops stay hand-written | Standard library; GeoJSON allocation per call is wrong at 60 fps |
| Color scales | `d3-scale` + `d3-color` + `d3-interpolate` | The one viz toolkit reused for charts and legends |
| Basemaps | Protomaps PMTiles + prebuilt styles, self-hosted; vendored RTL text plugin and Hebrew glyph ranges | Offline rule; Hebrew map labels |
| Dev data | In-app HTTP interceptor in `dev/` answering the real backend paths; registered only in the development environment file | Prod bundles contain no mock; cutover = delete it |
| Routing | Front page only (`/`) | Other pages much later, from the old app's page list |
| URL view state | None — the URL stays clean | Lead |
| Migration | A separate new app; route-by-route cutover behind a reverse proxy | No embedding the Angular 10 app |
| Devices | Desktop + control-room walls; no phone/tablet | Usage |

## Stack maturity (honest record)

The 2D path of MapLibre + deck.gl is mature and widely deployed. The globe path is young: it
works on deck 9.4 only with our per-layer depth/culling override, and deck's globe fixes are still
landing. Treat 2D as the solid floor. Any future
stack-level recommendation states its maturity and risk, not just strengths.

## Engine alternatives considered

Mapbox GL (license + phones home), Leaflet / OpenLayers (no GPU particles), deck.gl `GlobeView` as
the engine (experimental), CesiumJS (heavier on 8 GB, mismatched to 2D-style data layers), Esri
ArcGIS SDK as the engine (not used).

## Engine spike (2026-06-10)

Temperature colormap + wind particles at a locked 60 fps on an entry-level discrete GPU
(~1.65 MP), heap stable, knobs measurably trade load for fps; Chrome-for-Testing 113 boots clean
with zero errors. Residual risk: true integrated-GPU + 8 GB behavior is unverified — re-measure on
a representative mini-PC (the perf HUD ships for this).
