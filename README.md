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

## Status

Planning complete; **Slice 0 (foundation + engine spike)** is next. No application code yet.
