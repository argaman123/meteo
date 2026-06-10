# Meteo Platform — Frontend

A specialized meteorological visualization platform: a 3D globe (with a 2D toggle) layered with
colorful, animated weather data, plus tables, summaries, and reports. It runs on a closed/secure
internal network and serves defense, aviation/maritime, emergency, and casual users. It is a
**viewer** — forecasters author content in a separate tool; this app publishes and visualizes it.

This is a ground-up rebuild of a 6-year-old Angular 10 app, on Angular 22 + a MapLibre/deck.gl
rendering engine, designed above all to stay **simple, consistent, and easy for rotating junior
developers to maintain for years**.

## Start here

- **[`CLAUDE.md`](CLAUDE.md)** — the project's operating law (stack, architecture rules,
  conventions). Read this first.
- **[`docs/vision.md`](docs/vision.md)** — what the product is and everything it does.
- **[`docs/decisions.md`](docs/decisions.md)** — technical decisions and why.
- **[`docs/roadmap.md`](docs/roadmap.md)** — the build order (slices).
- **[`docs/domain/`](docs/domain/)** — meteorology, units, coordinates, conventions.
- **[`docs/specs/`](docs/specs/)** — the spec for each slice.

## Quickstart (dev machine, online)

```powershell
npm install            # restore dependencies
npm run fixtures       # generate sample model/observation data into public/fixtures
npm run basemap:fetch  # download basemap tiles (needs tools/bin/pmtiles.exe, see docs/dev/vendored-dependencies.md)
npm start              # dev server on http://localhost:4200
```

Other commands: `npm run build` (production build), `npm run serve:dist` (serve the built app on
:8080), `npm run lint`, `npm run typecheck`, `npm run format`.

Dev perf HUD: **Ctrl+Alt+P** or open the app with `?hud=1`.

## Status

**Slice 0 complete (2026-06-10)** — Angular 22 scaffold, RTL shell, self-hosted basemaps
(dark/light/colorful), map-engine adapter v1, fixtures, and the engine spike (temperature colormap +
wind particles at a measured 60 fps; Chrome-for-Testing 113 clean). Go/no-go: **GO** — see
[`docs/decisions.md`](docs/decisions.md). Next: **Slice 1**.
