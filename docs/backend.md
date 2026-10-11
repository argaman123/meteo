# The real backend — contract map

The backend is **hzy-liba** (Python FastAPI, `~/Desktop/code/hzy-liba`) — the standard. **MagenS**
(Java, `~/Desktop/code/MagenS`, old production) is consulted only for what Python lacks. Paths are
hzy-liba `src/components/…` unless noted. Our asks: [backend-asks.md](backend-asks.md).

## Rules (lead)

- Call the real routes; the dev fixture answers them ([fixtures.md](fixtures.md)).
  **`/api/*` is never the right request.**
- Each backend-vs-us difference is the lead's call, case by case — never a blanket rule.
- An ask is written in the backend's own idiom (snake_case `get_…_between_times`,
  `start_time`/`end_time`, their response shapes), one line each. Search all backend branches
  (`git grep origin/<branch>`) before writing one.
- Wire types mirror the wire (`types/`); conversion happens on receive.

## What we call

| Feature | Route(s) | Notes |
|---|---|---|
| Model maps, heights | `GET /model/data_with_flat_heights_with_limit/{model}/{ft}/{param}/{time}/params?min_lon&min_lat&max_lon&max_lat[&reduction]` | time-interpolated; ms |
| Model maps, pressures | `GET /model/data-limited/{model}/MB{mb}\|SFC/{param}/{time}/params?…` | exact model times only → we snap to 3 h |
| Meteogram temp/wind | `GET /model/air_column_in_between?model&lat&lon&start&end` | plain orjson text |
| Sounding table | `GET /model/air_column_nearest?model&lat&lon&forecasttime` | ask 3 |
| Polygons | `GET /polygon/get_maps_times?start_time&end_time&sector` → `GET /polygon/get_latest_polygons_by_time_sector_time_saved_status?time&sector&status=DISTRIBUTED` | ms; missing map = `null` with 200 |
| Meteogram clouds | `GET /polygon/get_point_events_between_times?lat&lon&start_time&end_time` | ask 2 |
| Satellite | `GET /satellite/getConfiguration`, `GET /satellite-sectors/get-all`, `GET /satellite/filterBy?start&end&source&sector&sat_id`, `GET /satellite/getImageBy?name&equalize=false&inverse=false` | seconds |
| Rain radar | `GET /radar/get_time_range_to_live_radars?start&end` → `POST /radar/get_wrap_for_entities { entities }` per frame | seconds; flattened + deduped by fileName |
| Bird radar | `GET /radar/get_time_range_to_bird_radars?start&end` → same frame POST | ask 6 |
| Filtered birds | `GET /observations/get_bird_specific_process?start&end` | **ms**, both inclusive |
| Observations | `GET /observations/getDataByParam?start&end&param&cache=false` | **ms**, end exclusive |
| Lightning | `GET /surface/get_lightning?start_time&end_time` | seconds both ways |

## Platform facts

- Each component mounts its own prefix (`/model`, `/polygon`, `/satellite`, `/radar`,
  `/observations`, `/surface`, `/sonde`…); hzy-liba's own `/api` router is unrelated slice
  endpoints.
- **Time units differ per component**: models, polygons, birds, `getDataByParam` = ms; satellite,
  radar, lightning, sondes = seconds. Sending ms to a seconds endpoint returns empty, not an error.
- No auth; CORS is an allow-list (`src/main.py`) — add our origin or proxy.
- Most data routes send gzip JSON with a manual `Content-Encoding: gzip`; equalized satellite PNGs
  are brotli; `air_column*` is plain text.
- Errors are mostly a generic 500; only `as_intended` routes return 400/404.
- **`Wrap`** (`common/datatypes/wrap.py`): `{ rx, ry, start_x, start_y, wrap_info, values }`,
  `values[row][col]`, lon = `start_x + rx·col`, lat = `start_y + ry·row`, row 0 = south, NaN →
  `null`. Model `wrap_info`: `{ info_type: "model", base_time, forecast_time (absolute ms), model
  (archive name), param, pressure ("-" on height routes), height (ft, "-" on pressure routes),
  direction_stack }`.

## Models

- `ModelEnum`: ECMWF (archive ECMWF01 — our "local"), BIG_ECMWF (ECMWF03 — "wide"), UKMET, NCEP,
  ICON, ICON_IL, ECMWF_WAVE (+ variants), ECMWF_DUST, FLIGHT, CMEMS, MAGEN_* (WRF). No
  coverage/bounds endpoint and no automatic model choice — the local coverage box is hardcoded in
  the frontend (placeholder until the lead sends the real one).
- Params: `TMP` (°C; at SFC ECMWF needs `SURFACE_TMP`), `HGT` (m; at SFC the backend serves MB1000),
  `RH` (at SFC → `SURFACE_RH`), `SLP` (height 0, hPa), `DEWPOINT`, `WIND` (`[speed_kt, dir_rad]`),
  `WINDSTR`/`WINDDIR`. `U`/`V` are ask 1. Waves: `WAVE_HEIGHT` (m) + `WAVE_DIR` (degrees "from") on
  the heights route at 0.
- Known flaw, accepted ("use whatever the backend provides"): the heights route blends `WAVE_DIR`
  linearly in time — near 0/360 an in-between hour can point the wrong way. Fix if it matters:
  wave U/V. No wave period on either backend.
- Levels: pressure enum names `SFC`, `MB1000`…`MB10`, `MSL`; height = int ft (0 = SFC).
- Map grids are bbox-cropped and resampled to ~70×70 (`models/service.py`); `reduction` is declared
  but unused (ask 4); `Wrap.limit` mislabels the crop start (ask 5).
- Listings: `/model/models`, `/model/base/{model}/{limit}`, `/model/forecast/{model}/{param}/{alt}`
  (ECMWF 3-hourly to +96 h then 6-hourly), `/model/parameters/{model}`, `/model/pressures`.
- Air column: `AirLevelData { pressure (mb), modelHeight (geopotential m), standardHeight,
  temperature, dewPoint (°C), rh (%), windDir (radians, math convention — verify live), windStr
  (kt), ws }`, 1000 mb first, no surface level, exact model times only (except our asks).

## Polygons (ms)

- One map per UTC hour per sector; statuses `SAVED` (draft) / `DISTRIBUTED` (viewers want this).
  `get_maps_times` rounds start to the nearest hour. A map's `startTime`/`endTime` both echo the
  requested time.
- Sectors `SECTOR-DEV`, `SECTOR-BIG`; bounds only in MagenS (`ForecastSectorWrap.kt`): DEV = lon
  33.3–37.3, lat 29.0–36.35; BIG = lon 33.3–56.4, lat 26.6–39.8.
- Events: `{ type, parameters, events }`. PRECIPITATION/CB/FOG nest in CLOUD (CB also under
  PRECIPITATION); HAZE/TURBULENCE are top-level. CLOUD `cloudBase`/`cloudTop` (kft),
  `cloud_eights` (`E0`…`E8`, ranges like `E24`); PRECIPITATION `precip_type` (six rain types + two
  snow types we ignore), `precip_prob`; CB `cb_type` SCATTERED / CB / CLOUDY, `cb_prob`; FOG/HAZE
  `*_min_vis` / `*_max_vis` (km), HAZE `haze_base`/`haze_top` (no surface flag). TURBULENCE, WIND,
  SNOW are obsolete.
- Coordinate order unconfirmed: hzy-liba assumes `[lat, lon]`, MagenS's point query reads
  `[lon, lat]` — we flip as `[lat, lon]` (ASSUMED until a real archive file is checked).

## Satellite (seconds)

- Satellites 8, 9. Channels `IR10.8` and `FLC` (a `source`); no color channel in Python. Sectors
  `modeq`, `noaeq` (default), `naseq`, `srneq`.
- `filterBy` → `SatImage[] { imgTime (s), satelliteId, fileName, … }`; `getImageBy?name` → a 1024²
  PNG, linear lat/lon over the sector box, raw unless `equalize=true`. IR calibration on the raw
  image: `°C = gray // 2 − 80` (`radar/common/processing/cleaning.py`).
- Bounds: `/satellite-sectors/get-all` → per satellite, per sector, per date (we take the latest).
- `getConfiguration` → `LimitedSatConf[]` — a schedule (`channel, startDateTime, startHour,
  endDateTime, endHour, satellite`), ported from MagenS's getConfigurationNativ logic.
  `getConfigurationNative` is broken.

## Radar (seconds)

- `get_time_range_to_live_radars` → `{ "<time s>": RadarEntity[] }` (`{ time, fileName, radarName,
  radarType, fileVersion (1 cartesian, 2 polar, 3 bird) }`); `…_to_radars?names` and
  `…_to_bird_radars` iterate names per character (ask 6).
- Frames: only `get_recent?name` (latest) or the heavy `POST get_wrap_for_entities` (recomputes
  from XML). Wrap of rain mm/h, no nulls: 0 = no echo, **negative = cleaned echo** (clutter/noise —
  the magnitude is real). Bird frames (`fileVersion: 3`) have no negatives; cell = height, unit
  ASSUMED meters.

## Observations

- `getDataByParam` (`param` ∈ `TMP|WIND|CLOUD|RAIN|RAIN_DAILY|GUST|RH|VIS|…`) → the latest row per
  location in the window: `[{ coords: [[lon, lat]], params: [{ name, value }] }]` (no time, no
  station id; values may be strings). `cache=true` returns the whole hour and can leak data after
  `end` — we send `false`. Cloud rows carry `cloud_cover_1..4` (eighths) and `cloud_base_1..4` (m).
- Birds: `SurfaceObsWithTime[][]`, one inner list per radar file: `{ coords, params: [{ name:
  "height", value: "<ft>" }], radar, obsTime (ms) }`; radar from the file prefix (`1316ISR` ramon,
  `1314ISR` meron, `dgnISR` merged — a radar name, `odim` eilat). Every file gets a sentinel row
  `[[0,0]]`, height `-1` — dropped.
- Lightning: obs rows `{ coords, params, obsTime }`, `params[0].value` = peak current kA as a
  string, sign = polarity.

## Not used yet

- Real radiosondes (`/sonde`): `get-times`, `get-by-time`, `get-latest-sonde`, `get-nearest-sonde`
  → levels like `AirLevelData` + `time` (−9999 = null; a real 0 also becomes −9999). Stations:
  `/places/get-sonde-stations`.

## Open

Everything waiting on the backend team or real data (routes, data, confirmations) is one list:
[backend-asks.md](backend-asks.md).
