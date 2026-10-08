# Dev fixture backend — `src/app/dev/fixture-backend/` (never ships)

- An HTTP interceptor registered only by `environment.development.ts` (production swaps the file
  via `fileReplacements`, so no mock ships). It answers the REAL backend paths: `BACKEND_PATHS`
  prefixes + a `ROUTES` regex table in `fixture-backend.ts`; anything else passes through.
  Cutover = delete the interceptor and proxy the paths.
- Fixtures mirror the real wire exactly, including each asked shape in
  [backend-asks.md](backend-asks.md) until it lands. Unmatched route → 404, handler error → 500.
- The lead judges looks through fixture data: made-up data must look physically plausible, and a
  real proxy unlike local reality is worse than made-up.

## Models — real ECMWF (`ecmwf-weather.ts`)

- `npm run ecmwf:fetch` (`tools/fetch-ecmwf.py`, Python in a gitignored `tools/.venv` — GRIB2 has no
  usable Node decoder) pulls the latest ECMWF IFS open-data run (0.25°, CC-BY 4.0, dev only) and
  writes 16-bit scale/offset files + `manifest.json` into gitignored `public/fixtures/ecmwf/`
  (~290 MB, 0–144 h every 3 h): pressure `t/u/v/gh/r` on 12 levels 1000…100 mb, surface
  `2t/2d/10u/10v/msl`, waves `swh/mwd` (land = missing → NaN). It writes a temp folder and swaps it
  in on success. Missing folder → a console error naming the command; model routes 500.
- Time is re-anchored: the run's base shifts by whole days to ≤ 24 h before app load (keeps the
  diurnal cycle true; 144 h fetched so the 96 h future stays covered). Re-fetch only for fresher
  weather.
- Both models serve the same 0.25° data. Feet heights interpolate through each point's `gh`
  profile; mb levels read directly; heights-route times interpolate between 3 h steps; ~70×70
  resampling unless `reduction`. Surface RH from `2t`/`2d`; air-column routes read the same files
  (dewpoint from t + r). Raw RH overshoots (−4…125%) pass through as the backend would.

## Made-up sources

- **Polygons** (`synthetic-polygons.ts`) — authored scenes shifted into the requested sector per
  3 h map (four kinds, overlaps, a multi-event storm, one polygon poking outside the square); the
  point-events route point-in-polygons the same scenes.
- **Satellite** (`synthetic-satellite.ts`) — vendored GeoColor sequences, 19 frames per sector at
  10-min cadence (`public/fixtures/satellite/{near,wide}-{0..18}.jpg`, from EUMETSAT's open WMS via
  `tools/fetch-satellite.mjs <day> [startHourZ] [frames]`). Requested times map monotonically into
  the sequence anchored at app load (~2 h history, ~1 h live headroom — then the newest frame
  freezes: restart or re-vendor); in-between times blend forward. IR = grayscale of the color
  image, so fixture IR temperatures are meaningless.
- **Radar** (`synthetic-radar.ts`) — rain follows the cloud: sampled from the near-sector satellite
  frames' moving whiteness minus the still-ground minimum. Two radars with different cadences
  (3 / 10 min) stress loop sync; values masked outside each radar's circle.
- **Observations** (`synthetic-observations.ts`) — ~1,000 land-only stations (the lead's
  `temperature.json` stations + seeds, land-tested against `public/fixtures/land.geojson`), smooth
  regional ripple fields per parameter, every 5th station updates hourly; cloud base quantized to
  500 ft so label strings stay bounded.
- **Birds** (`synthetic-birds.ts`) — an October southbound migration: 90 small flocks along the Rift
  Valley and the coast, 40–60 km/h, 500–5,000 ft; detections per radar every 5 min (eilat 10); raw
  grids add ground clutter concentrated near each radar.
- **Lightning** (`synthetic-lightning.ts`) — 4 drifting storm cells with 4 h life cycles, seeded per
  10-s slot so overlapping asks agree, ~15% positive.
