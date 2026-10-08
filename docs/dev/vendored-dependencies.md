# Vendored Dependencies & Offline Workflow

The runtime network is **internal-only with no package registry**. Everything the app needs —
npm packages, fonts, basemap tiles, styles, plugins, sample data — is prepared on an online
machine and hand-carried inside. Development uses good libraries freely; at cutover every dependency is audited (transitive tree, no
phone-home/CDN/telemetry) and carried in.

## npm packages (outside → inside)

1. On the online machine, install/update as usual (`npm install <pkg>`), commit the resulting
   `package.json` + `package-lock.json`.
2. Before carrying, populate a complete tarball cache next to the repo:

   ```powershell
   npm ci --cache .npm-cache
   ```

3. Hand-carry the repo **including `.npm-cache`** (and excluding `node_modules`, which is rebuilt).
4. Inside the network, restore without any registry access:

   ```powershell
   npm ci --offline --cache .npm-cache
   ```

5. Adding a package later: repeat from step 1 outside, re-carry the changed `.npm-cache` delta +
   lockfile.

`.npm-cache/` is not committed to git — it travels alongside the repo on the carry medium.

## Self-hosted static assets

| Asset | Where it lives | Source | How to re-fetch |
|---|---|---|---|
| Heebo font (variable, Hebrew+Latin+Latin-ext woff2 + OFL license) | `public/fonts/heebo/` | `@fontsource-variable/heebo` (npm, dev-only) | `npm i -D @fontsource-variable/heebo`, copy from `node_modules/@fontsource-variable/heebo/files/` |
| Source Sans 3 font (variable, Latin+Latin-ext woff2 + OFL) | `public/fonts/source-sans/` | Source Sans 3 (Adobe, OFL) | Re-download the variable woff2 files |
| Map icons (SVG pairs + LICENSE-lucide) | `public/icons/` | Authored / lucide (ISC) | Copy from lucide, keep the notice |
| Planet vector basemap (low zoom) | `public/basemaps/planet.pmtiles` (gitignored) | Protomaps prebuilt daily build | `npm run basemap:fetch` (uses `pmtiles extract`) |
| Terrain raster basemap (colorful ground) | `public/basemaps/terrain.pmtiles` (gitignored) | Prebuilt Natural Earth cross-blended-hypso + shaded-relief raster tiles (public-domain data) | `npm run basemap:fetch` (downloads mbtiles, `pmtiles convert`) |
| Basemap styles (dark/light/colorful) | `public/basemaps/styles/*.json` | Prebuilt style JSON from maps.protomaps.com ("Get style JSON", flavor + lang=he) | Re-download, re-apply the three self-hosting patches below |
| Map glyphs (PBF font ranges, incl. Hebrew `1280-1535.pbf`) + sprites | `public/basemaps/fonts/`, `public/basemaps/sprites/` | github.com/protomaps/basemaps-assets | Clone and copy `fonts/` + `sprites/` |
| RTL text plugin | `public/basemaps/rtl/` | `@mapbox/mapbox-gl-rtl-text` (npm, dev-only) | Copy the dist `.js` from `node_modules` |
| Satellite fixture frames (dev only) | `public/fixtures/satellite/` | EUMETSAT open WMS GeoColor | `node tools/fetch-satellite.mjs <day>` |
| ECMWF fixture (dev only, gitignored) | `public/fixtures/ecmwf/` | ECMWF IFS open data (CC-BY 4.0) | `npm run ecmwf:fetch` |
| `pmtiles` CLI | `tools/bin/pmtiles.exe` (gitignored) | github.com/protomaps/go-pmtiles releases | Download the Windows x86_64 release binary |
| Chrome for Testing 113 (browser-floor smoke tests) | `tools/cft/` (gitignored) | `npx @puppeteer/browsers install chrome@113 --path tools/cft` | Re-run the same command |

Weather layers render through first-party looks over `@deck.gl/layers` + `@luma.gl` (wind
trails). `weatherlayers-gl` was removed (2026-06), which also dropped its `geotiff` /
`@scarf/scarf` install-time telemetry transitive.

`d3-scale` (+ `d3-interpolate`, `d3-color`) added during the rebuild (2026-06) for colormap colour
scaling — pure JS, popular, no runtime telemetry; chosen over the color-specialist `chroma.js`
because d3 is the one viz toolkit we reuse later for axes/legends/charts (handoff over specialization).

### Style JSON self-hosting patches

Downloaded styles reference hosted assets; exactly three fields are patched to local paths:

```
sources.protomaps.url  →  "pmtiles:///basemaps/planet.pmtiles"
glyphs                 →  "/basemaps/fonts/{fontstack}/{range}.pbf"
sprite                 →  "/basemaps/sprites/v4/<flavor>"
```

After any style re-download, grep the JSON for `http` — nothing in committed code or assets may
point at a CDN or external host.

Committed styles keep **root-relative** URLs (host-agnostic); MapLibre requires absolute sprite
URLs, so the engine adapter absolutizes them against `location.origin` when loading a style.

## Rules recap

- No CDN URLs anywhere in code, styles, or committed assets.
- Every vendored asset ships with its license file next to it where the license requires.
- Large binaries (`*.pmtiles`) are **build artifacts**: gitignored, recreated by `npm run
  basemap:fetch` outside, hand-carried inside alongside the repo.
