# The real backend — contract map

The backend is **hzy-liba** (Python FastAPI, `~/Desktop/code/hzy-liba`) — the standard. **MagenS**
(Java, `~/Desktop/code/MagenS`, old production) is consulted only for what Python lacks. Paths are
hzy-liba `src/components/…` unless noted. Our asks: [backend-asks.md](backend-asks.md). Real
responses the lead captured: `~/Desktop/for_argos/<area>/<route>.json` (first line = the request in
`{{…}}`, sometimes a `post_body:{{{…}}}`, then the body) — the ground truth over code reading.

## Rules (lead)

- Call the real routes; the dev fixture answers them ([fixtures.md](fixtures.md)). On the network,
  the browser calls `BACKEND_URL` (`src/environments/environment.ts`) directly — `backendUrlInterceptor`
  (`src/app/backend.ts`) prefixes every `BACKEND_PATHS` request. Not landed yet (empty on real
  data): wind U/V (ask 1), meteogram clouds (ask 2), sounding table (ask 3), bird radar (ask 6).
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
- No auth; CORS is an allow-list (`src/main.py`) — every host serving the frontend must be on it (ask 19).
- Most data routes send gzip JSON with a manual `Content-Encoding: gzip`; equalized satellite PNGs
  are brotli; `air_column*` is plain text.
- Errors are mostly a generic 500; only `as_intended` routes return 400/404.
- **`Wrap`** (`common/datatypes/wrap.py`): `{ rx, ry, start_x, start_y, wrap_info, values }`,
  `values[row][col]`, lon = `start_x + rx·col`, lat = `start_y + ry·row`, row 0 = south, NaN →
  `null`. Model `wrap_info`: `{ info_type: "model", base_time, forecast_time (absolute ms), model
  (archive name), param, pressure ("-" on height routes), height (ft, "-" on pressure routes),
  direction_stack }`.

## Models

- `ModelEnum`: ECMWF (archive ECMWF01 — our "local"), BIG_ECMWF (ECMWF03 — "wide"), UKMET_NEW, NCEP,
  ICON, ICON_IL, ECMWF_WAVE (+ variants), ECMWF_DUST, FLIGHT, CMEMS, MAGEN_* (WRF). No
  coverage/bounds endpoint and no automatic model choice — the local box is hardcoded in the
  frontend (`LOCAL_COVERAGE`). ECMWF01's real grid: 0.1°, lon 19–55, lat 19–46 (lead-confirmed),
  south-first — from `GET /model/get_data/{model}/{alt}/{param}/{time}/params`, which returns the
  whole native archive grid (ignores bbox and `reduction`).
- `wrap_info.param` echoes the archive name (`HGT` → `GH`); `direction_stack` is absent on plain
  params. `/model/height/{model}` → max height in ft (ECMWF 80000).
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
- Coordinates are `[lon, lat]`, rings closed (real sample; places and stations are `"[lon, lat]"`
  strings too).
- A state: `{ startTime, endTime, sector, status, timeEdited, polygons }`; each polygon carries its
  own `status`. Real CLOUD also sends `cloud_is_layered`, `cloud_is_layered_in_waves`,
  `cloud_freezing_level`; PRECIPITATION `precip_frequency` (`LOCAL`, `SOMETIMES`, `INTERMITTENTLY`,
  `OCCASIONALLY`), `precipMinBase`/`precipMaxTop`, accumulation/visibility fields; CB
  `cbMinBase`/`cbMaxTop`, `cbMinVis`/`cbMaxVis`, `cb_const_wind`, `cb_gust`, `cb_sand_storm`,
  `cb_heavy_hail`. In the sample CB sits directly under CLOUD.

## Satellite (seconds)

- Real archive (`getBy?start&end`, every image of every source): satellites 8 (`IR10.8`, `IR12.0`,
  `IR3.9`, `IR8.7`, `IR9.7`, `IR1.6`, `WV6.2`, `WV7.3`, `VIS0.6`, `HRV`, `DUST`, `FLC`; 5 min) and 9
  (`IR10.8`, `WV6.2`, `WV7.3`, `VIS0.6`, `HRV`, `DUST`, `FLC`; 15 min) as `.xml` files; satellite 12
  (MTG: `COLORED`, `AIRMASS`, `DAY`, `DUST`, `FOG`, `FLC`, `LIAF`, `IR10.5`, `VIS0.9`; 10 min) as
  ready `.png` files. Sectors `modeq`, `noaeq` (default), `naseq`, `srneq`; sector bounds also list
  satellite 10.
- `filterBy` → `SatImage[] { imgTime (s), satelliteId (a string, "9"), fileName, … }`; `getImageBy?name` → a 1024²
  PNG, linear lat/lon over the sector box, raw unless `equalize=true`. IR calibration on the raw
  image: `°C = gray // 2 − 80` (`radar/common/processing/cleaning.py`).
- Bounds: `/satellite-sectors/get-all` → per satellite, per sector, per date (we take the latest).
- `getWrapData?file_name` → the image as a 1024² `Wrap` of gray 0–255; `getAllIRPresets` → 40 IR
  color presets, each a JSON string `{ id, colors: [{ min, max, minColor, maxColor }] }` (°C).
- `getConfiguration` → `LimitedSatConf[]` — a schedule (`channel, startDateTime, startHour,
  endDateTime, endHour, satellite`), ported from MagenS's getConfigurationNativ logic.
  `getConfigurationNative` is broken.

## Radar (seconds)

- Radars: `/radar_configuration/get_radars` → `{ name, type, resolution, angle, … }[]`: rain
  `merged` (PPI), `meron`/`ramon`/`mekorot` (MAX), `h5cy`, `cyprus`, `larnaca`, `paphos`, `eilat`,
  `eilatNew`, `hatay`, `ersrum`, `sanliufra` (SCAN); birds `mergedBIRD`, `meronBIRD`, `eilatBIRD`.
  The live list (`get_live_radar`) is emptied while the radars are off for the summer (sampled
  `["x"]`), so `get_time_range_to_live_radars` returns `{}` then — expected.

- `get_time_range_to_live_radars` → `{ "<time s>": RadarEntity[] }` (`{ time, fileName, radarName,
  radarType, fileVersion (1 cartesian, 2 polar, 3 bird) }`); `…_to_radars?names` and
  `…_to_bird_radars` iterate names per character (ask 6).
- Frames: only `get_recent?name` (latest) or the heavy `POST get_wrap_for_entities` (recomputes
  from XML). Wrap of rain mm/h, no nulls: 0 = no echo, **negative = cleaned echo** (clutter/noise —
  the magnitude is real). Bird frames (`fileVersion: 3`) have no negatives; cell = height, unit
  ASSUMED meters (the sampled eilatBIRD frame peaks at 4162).

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

- Real radiosondes (`/sonde`, seconds): `get-times`, `get-latest-times`, `get-relevant-stations`,
  `get-by-time`, `get-latest-sonde`, `get-nearest-sonde` → `{ real, interp }`, each a list of levels
  like `AirLevelData` + `time`, unsorted, `windDir` in degrees (−9999 = null; a real 0 also becomes
  −9999). Stations: `/places/get-sonde-stations` → `{ block_station, station_call, place }`.
- Also sampled, unused: `/timeline` (forecaster timeline: flat events per place), `/new-warnings`,
  `/warnings`, `/base-status` (status + latest observation per base), `/bl-view` (base64 PNG images),
  `/observations/getByBlockAndTimeRange` (full METAR rows per station), `/places/*`,
  `/images/*` (rendered bird-forecast and base-status pictures).

## Open

Everything waiting on the backend team or real data (routes, data, confirmations) is one list:
[backend-asks.md](backend-asks.md).
