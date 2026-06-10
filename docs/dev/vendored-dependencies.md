# Vendored Dependencies & Offline Workflow

The runtime network is **internal-only with no package registry**. Everything the app needs —
npm packages, fonts, basemap tiles, styles, plugins, sample data — is prepared on an online
machine and hand-carried inside. Adding a dependency is a deliberate act requiring sign-off
(`CLAUDE.md` §7).

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
| Planet vector basemap (low zoom) | `public/basemaps/planet.pmtiles` (gitignored) | Protomaps prebuilt daily build | `npm run basemap:fetch` (uses `pmtiles extract`) |
| Terrain raster basemap (colorful ground) | `public/basemaps/terrain.pmtiles` (gitignored) | Prebuilt Natural Earth cross-blended-hypso + shaded-relief raster tiles (public-domain data) | `npm run basemap:fetch` (downloads mbtiles, `pmtiles convert`) |
| Basemap styles (dark/light/colorful) | `public/basemaps/styles/*.json` | Prebuilt style JSON from maps.protomaps.com ("Get style JSON", flavor + lang=he) | Re-download, re-apply the three self-hosting patches below |
| Map glyphs (PBF font ranges, incl. Hebrew `1280-1535.pbf`) + sprites | `public/basemaps/fonts/`, `public/basemaps/sprites/` | github.com/protomaps/basemaps-assets | Clone and copy `fonts/` + `sprites/` |
| RTL text plugin | `public/basemaps/rtl/` | `@mapbox/mapbox-gl-rtl-text` (npm, dev-only) | Copy the dist `.js` from `node_modules` |
| Satellite fixture PNG | `public/fixtures/satellite/` | NASA Worldview snapshot (public domain) | One-time fetch; sidecar `.json` records bbox/time/source |
| `pmtiles` CLI | `tools/bin/pmtiles.exe` (gitignored) | github.com/protomaps/go-pmtiles releases | Download the Windows x86_64 release binary |

### Style JSON self-hosting patches

Downloaded styles reference hosted assets; exactly three fields are patched to local paths:

```
sources.protomaps.url  →  "pmtiles:///basemaps/planet.pmtiles"
glyphs                 →  "/basemaps/fonts/{fontstack}/{range}.pbf"
sprite                 →  "/basemaps/sprites/v4/<flavor>"
```

After any style re-download, grep the JSON for `http` — nothing in committed code or assets may
point at a CDN or external host.

## Rules recap

- No CDN URLs anywhere in code, styles, or committed assets.
- Every vendored asset ships with its license file next to it where the license requires.
- Large binaries (`*.pmtiles`) are **build artifacts**: gitignored, recreated by `npm run
  basemap:fetch` outside, hand-carried inside alongside the repo.
