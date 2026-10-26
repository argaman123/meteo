# Vendored Dependencies & Offline Workflow

The runtime network is **internal-only with no package registry**. Everything the app needs —
npm packages, fonts, basemap tiles, styles, plugins, sample data — is prepared on an online
machine and hand-carried inside. Development uses good libraries freely; at cutover every dependency is audited (transitive tree, no
phone-home/CDN/telemetry) and carried in.

## npm packages (outside → inside)

1. On the online machine, install/update as usual (`npm install <pkg>`), commit the resulting
   `package.json` + `package-lock.json`.
2. Before carrying, fill a tarball cache next to the repo with the **Windows** builds of the native
   tools (esbuild, lightningcss, Tailwind oxide) — a plain `npm ci` on the Mac caches only macOS
   ones, and the offline install then fails. From the repo root:

   ```sh
   rm -rf /tmp/win-cache && mkdir /tmp/win-cache && cp package.json package-lock.json /tmp/win-cache/
   (cd /tmp/win-cache && npm ci --cache "$OLDPWD/.npm-cache" --os=win32 --cpu=x64 --ignore-scripts)
   ```

3. Hand-carry the repo **including `.npm-cache`** (and excluding `node_modules`, which is rebuilt).
4. Inside the network, restore without any registry access:

   ```powershell
   npm ci --offline --cache .npm-cache
   ```

5. Adding a package later: repeat from step 1 outside, re-carry the changed `.npm-cache` delta +
   lockfile.

## Carrying the project in

Carry: the repo without `node_modules/` (git clone or copy), `.npm-cache/`,
`public/basemaps/*.pmtiles` (gitignored), and the Node 24 Windows installer (nodejs.org,
`node-v24.x-x64.msi`; the `win-x64.zip` needs no admin rights). `public/fixtures/` is not needed.

On the PC: install Node, `node -v` (24.15+ or 22.22+), `npm ci --offline --cache .npm-cache`, set
`BACKEND_URL` in `src/environments/environment.ts`, `npm run start` → http://localhost:4200 on
real data (the backend must allow that origin — `origins` in hzy-liba's `src/main.py`). Build:
`npm run build` (or `npx ng build`) → `dist/meteo/browser`; nginx serves it
(`tools/nginx/meteo.conf`: set `root`; the nginx host must be on the backend's `origins` too).

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
| Place names (search) | `public/search/places.json` | GeoNames dumps (CC BY 4.0 — requires attribution) | `npm run places:fetch` (downloads cached in gitignored `tools/.places-download/`) |
| Satellite fixture frames (dev only) | `public/fixtures/satellite/` | EUMETSAT open WMS GeoColor | `node tools/fetch-satellite.mjs <day>` |
| ECMWF fixture (dev only, gitignored) | `public/fixtures/ecmwf/` | ECMWF IFS open data (CC-BY 4.0) | `npm run ecmwf:fetch` |
| `pmtiles` CLI | `tools/bin/pmtiles.exe` (gitignored) | github.com/protomaps/go-pmtiles releases | Download the Windows x86_64 release binary |
| Chrome for Testing 113 (browser-floor smoke tests) | `tools/cft/` (gitignored) | `npx @puppeteer/browsers install chrome@113 --path tools/cft` | Re-run the same command |

Weather layers render through first-party looks drawn with MapLibre's own sources and layers (wind
trails: our own WebGL2 custom layer). `weatherlayers-gl` and deck.gl/luma.gl were removed;
`weatherlayers-gl` also dropped its `geotiff` / `@scarf/scarf` install-time telemetry transitive.

`@maskito/core` + `angular` + `kit` (Taiga UI team, Apache-2.0, no telemetry) for the coordinate
form's input masks.

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
