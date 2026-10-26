# Meteo Platform — Frontend

A meteorological viewer for a closed internal network: a 2D map layered with colorful, animated
weather data (models, satellite, radar, observations, forecaster polygons) plus point tools
(meteogram, sounding table, distance measuring). A ground-up rebuild of an Angular 10 app on
Angular 22 + MapLibre, built to stay simple and consistent for rotating developers.

## Start here

- [`CLAUDE.md`](CLAUDE.md) — the rules, the tree, the conventions, the traps.
- [`docs/`](docs/) — one short file per area (layers, engine, time, point views, chrome, backend,
  fixtures) plus the plan and the product vision.

## Run (dev machine, online)

```sh
npm install
npm run ecmwf:fetch    # real ECMWF fixture data into public/fixtures/ecmwf (gitignored, ~290 MB)
npm run basemap:fetch  # basemap tiles (see docs/dev/vendored-dependencies.md)
npm run start:fixtures # http://localhost:4200 on fixture data
```

`npm run start` serves against the real backend: set `BACKEND_URL` in
`src/environments/environment.ts`. Also:
`npm run build` (output `dist/meteo/browser`, served by nginx — sample in `tools/nginx/meteo.conf`),
`npm run lint`, `npm run typecheck`, `npm run serve:dist`. The perf HUD is on by default;
Ctrl+Alt+P toggles it.

## Run inside the network (Windows, offline)

See [docs/dev/vendored-dependencies.md](docs/dev/vendored-dependencies.md#carrying-the-project-in).
