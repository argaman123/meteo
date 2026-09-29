# The real backend — contract map

Research of 2026-09-28 against the Python backend **hzy-liba** (`~/Desktop/code/hzy-liba`, FastAPI,
the standard) with the Java **MagenS** (`~/Desktop/code/MagenS`, old production) consulted only for
what Python lacks. Paths below are hzy-liba `src/components/…` unless noted. The frontend's current
requests all go to an invented `/api/*` contract served by `dev/fixture-backend/`; this file maps
each one onto the real routes and lists the gaps. Nothing here is migrated yet.

## Platform-wide facts

- **No `/api` prefix on data routes.** Each component mounts its own prefix (`/model`, `/polygon`,
  `/satellite`, `/radar`, `/observations`, `/sonde`, …). hzy-liba's own `/api` router is the
  cross-height/cross-time slice endpoints — a dev proxy rewriting our `/api/*` would collide.
- **Time units differ per component.** Models, polygons, timeline: **ms**. Satellite, radar,
  observations, base status, sondes (unverified), new-warnings: **seconds**. Sending ms to a seconds
  endpoint returns empty, not an error. Our rule (ms end to end) → convert at the request/receive
  boundary only.
- **No auth. CORS is an allow-list** (`src/main.py:62-80`) — our dev origin must be added, or proxied.
- **Encodings:** most data routes send gzip JSON with a manual `Content-Encoding: gzip` (browser
  decodes transparently); equalized satellite PNGs are brotli; `air_column*` is plain orjson text.
- **Errors:** most failures are a generic 500; only `as_intended` routes return 400/404. A missing
  polygons map is `null` with 200.
- **`Wrap`** (`common/datatypes/wrap.py`): `{ rx, ry, start_x, start_y, wrap_info, values }`,
  `values[row][col]`, lon = `start_x + rx·col`, lat = `start_y + ry·row`, **row 0 = south**
  (ECMWF's flipud + `latitudeOfFirstGridPoint` origin should be verified on a live response).
  NaN → `null`. Model `wrap_info = { info_type:"model", base_time, forecast_time, model (archive
  name, e.g. ECMWF01), param (GRIB alias: T, GH, WIND…), pressure ("-" on height routes), height
  (ft int, "-" on pressure routes), direction_stack }`.

## Models (`/model`, `/api`)

- **Models** (`ModelEnum`, `models/common/datatypes/model_enum.py`): ECMWF, BIG_ECMWF, UKMET, NCEP,
  ICON, ICON_IL (archive ILICON), ECMWF_WAVE(+COARSE/FINE/EILAT/RED), ECMWF_DUST, FLIGHT, CMEMS,
  MAGEN_DUST/SPECIAL/NCEP/BIG_NCEP/SPECIFIC (WRF, Lambert regridded). Default everywhere: ECMWF.
  **No coverage/bounds endpoint and no automatic model choice** in either backend (MagenS had
  `/model_accuracy/get_model_bounds?model-name=`).
- **Parameters on the wire:** `TMP` (°C; ECMWF has none at SFC → `SURFACE_TMP`), `HGT`
  (geopotential m), `DEWPOINT`, `RH`, `WIND` (3-D: `values[row][col] = [speed_kt, dir_rad]`,
  direction = `arctan2(v,u)` math convention — verify live), `WINDSTR`/`WINDDIR`, `SURFACE_WIND`.
  **No u/v served.**
- **Levels:** pressure = enum names `SFC`, `MB1000`…`MB10`, `MSL`, `TWO_ML`, `TEN_ML`; height = int ft
  (0 = SFC).
- **Map grid** — two routes, both bbox-cropped and **resampled to ~70×70** (`models/service.py:18`),
  gzip Wrap:
  - pressure: `GET /model/data-limited/{model}/{alt}/{param}/{forecast}/params?min_lon&min_lat&max_lon&max_lat[&base_time][&scale_method]`
    — `forecast` must be an **exact model time** (no time interpolation; missing → 500).
  - height: `GET /model/data_with_flat_heights_with_limit/{model}/{height_ft}/{param}/{forecast}/params?…`
    — **interpolates in time** between bracketing model times (`run_ft`), any hour inside the run.
  - Base time defaults to the latest before `forecast`.
- **Listings:** `GET /model/models`; `GET /model/base/{model}/{limit}?time=` (ms, newest first);
  `GET /model/forecast/{model}/{param}/{alt}?base=` (ms; ECMWF 3-hourly to +96h then 6-hourly);
  `GET /model/parameters/{model}`; `GET /model/pressures?models=`; `GET /model/height/{model}`.
- **Point × height × time** (meteogram source): `POST /api/points_data_between_heights_and_times_in_feet?model=`
  body `{ start_height, end_height (ft, 1000-ft ladder, <0 = surface), params: ["TMP"], start_time,
  end_time (ms, whole hours, time-interpolated), points: [lat,lon,lat,lon…] }` → flat array of 1×1
  Wraps (param → height → hour → point), height as a string in `wrap_info.height`, values floored to
  2 decimals, missing layers dropped. **Caps: 35 points, 24 h span, silently truncated**
  (`api/service.py:41-43`). `WIND` returns speed only.
- **Point vertical profile** (sounding source): `GET /model/air_column?model&lat&lon&forecasttime&basetime`
  → `AirLevelData[] { pressure (mb), modelHeight (geopotential m), standardHeight (ISA m),
  temperature, dewPoint (°C), rh (%), windDir, windStr (kt), ws (mixing ratio) }`, 1000 mb first,
  **surface excluded, exact forecast time only**. `/air_column_interp` = bilinear variant.

## Polygons (`/polygon`) — all ms

- Storage: one map per **UTC hour** per sector; statuses `SAVED` (draft) / `DISTRIBUTED`
  (published). Viewers want DISTRIBUTED.
- **Map times:** `GET /polygon/get_maps_times?start_time&end_time&sector` →
  `[{ startTime, status, timeSaved }]` (filter `status === 'DISTRIBUTED'`). Start rounds to the
  *nearest* hour.
- **Map:** `GET /polygon/get_latest_polygons_by_time_sector_time_saved_status?time&sector&status=DISTRIBUTED`
  → `PolygonsState { startTime, endTime (both echo the requested time — meaningless), sector, status,
  timeEdited, polygons: [{ coordinates: number[][], forecastEvents, status }] }` or `null`.
- **Batch:** `GET /polygon/get_polygon_states_between_times?start_time&end_time&sector&status` →
  `PolygonsState[]`.
- **Sectors:** `SECTOR-DEV`, `SECTOR-BIG`. Bounds only in MagenS (`ForecastSectorWrap.kt`):
  DEV = lon 33.3–37.3, lat 29.0–36.35; BIG = lon 33.3–56.4, lat 26.6–39.8 (DEV lies inside BIG).
- **Events:** generic `{ type, parameters: {…}, events: [...] }`, types `CLOUD`, `FOG`,
  `PRECIPITATION`, `CB`, `HAZE`, `TURBULENCE`, `WIND`, `SNOW`. PRECIPITATION/CB/FOG nest in
  `CLOUD.events` (CB also under PRECIPITATION); HAZE/TURBULENCE top-level. Parameter keys:
  CLOUD `cloudBase`/`cloudTop` (kft), `cloud_eights` (`E0`,`E02`,`E13`,`E24`,`E35`,`E46`,`E57`,
  `E68`,`E8`), `cloud_prob`…; PRECIPITATION `precip_type` (`VIRGOT`,`DRIPPING`,
  `DRIPPING_MEDIUM_RAIN`,`MEDIUM_RAIN`,`MEDIUM_HIGH_RAIN`,`HEAVY_RAIN`,`MIXED_SNOW`,`HEAVY_SNOW`),
  `precip_prob`…; CB `cb_type` (values unknown — external MagenS jar), `cb_prob`, `cbMinBase`,
  `cbMaxTop`…; FOG `fog_min_vis`/`fog_max_vis` (km?), `fog_prob`; HAZE `haze_min_vis`,
  `haze_max_vis`, `haze_base`, `haze_top`, `haze_prob` (**no surface/high flag**); TURBULENCE
  `turbulence_strength`, `turbulence_min_height`, `turbulence_max_height`, `turbulence_prob`.
- **Coordinate order unconfirmed** — hzy-liba assumes `[lat, lon]`, MagenS's point query reads
  `[lon, lat]`. Check a real archive file.
- **No point query in Python.** MagenS: `GET /forecast/getEventsByPoint?lat&lon&from&to`.

## Satellite (`/satellite`, `/satellite-sectors`) — seconds

- Satellites 8, 9 (MagenS also 10). Channels `IR10.8` (IR), `HRV` (high-res visible). **No color
  channel** (RGB composites exist only in MagenS). Sectors `modeq`, `noaeq` (default), `naseq`,
  `srneq`.
- **Images list:** `GET /satellite/filterBy?start&end&source&sector&sat_id` → gzip
  `SatImage[] { imgTime (s), satelliteType, satelliteId, satelliteSector, satelliteSource, fileName
  (.xml), channel_number, current_channel }`. Also `getClosestEntity?unix&source&sector&sat_id`
  (±10 min), `getLast/{num}`.
- **Image:** `GET /satellite/getImageBy?name=<fileName>&equalize=<bool>&inverse=<bool>` → 1024²
  PNG, linear lat/lon over the sector box; raw unless `equalize=true` (then brotli). IR calibration on
  the raw image: `°C = green // 2 − 80` (radar/common/processing/cleaning.py:247).
- **Bounds:** `GET /satellite-sectors/get-all` → `[{ id, modeq?: [{ date, coords: { west, south,
  east, north } }], … }]` — per satellite, per sector, **per date**.
- **Configuration:** `GET /satellite/getConfiguration` → `LimitedSatConf[] { channel,
  startDateTime, startHour, endDateTime, endHour, satellite }` (a schedule, not defaults);
  `getConfigurationNative` is **broken** (service.py:202).

## Radar (`/radar`, `/radar_configuration`) — seconds

- **Times:** `GET /radar/get_time_range_to_live_radars?start&end` → `{ "<time s>": RadarEntity[] }`
  (keyed by time, emitted only when the set of radars changes) with `RadarEntity { time, fileName,
  radarName, radarType, fileVersion (1 cartesian, 2 polar, 3 bird) }`. `…_to_radars?names` and
  `…_to_bird_radars` are **broken** (names iterated per character). `get_last?last&name&type` →
  `RadarEntity[]`.
- **Frame:** only `GET /radar/get_recent?name` (**latest frame only**) and
  `POST /radar/get_wrap_for_entities { entities, reduction?, time? }` (recomputes from XML — heavy).
  gzip Wrap `wrap_info { info_type:"radar", name, time (s), type }`, rain mm/h, **no nulls** —
  0 = no echo, **negative = cleaned echo** (clutter / beyond radius). MagenS had
  `GET /raw_radar/get_specific_time?time&type&name&reduction`.
- **Radars:** `GET /radar_configuration/get_radars` → `[{ name, type, resolution, angle, polarScale,
  blobSize, maxRadius (bins), temperatureThreshold }]`; `get_live_radar` → `{ names, … }`. Location/
  range live in each frame's XML header only.

## Observations (`/observations`) — seconds, except `getDataByParam` (ms)

- **Closest to our need:** `GET /observations/getDataByParam?start&end (ms, end exclusive)&param&cache=false`,
  `param` ∈ `TMP|WIND|CLOUD|RAIN|RAIN_DAILY|GUST|RH|VIS|HI|CI|SFC_PRESSURE` → latest row per
  location in the window: `[{ coords: [[lon, lat]], params: [{ name, value }] }]` (no time, no
  station id). `cache=true` returns the whole hour containing `start` — can leak data after `end`.
- Full rows: `GET /observations/get-by-range?start&end` (default ~21 OBSERVATION stations) → nested
  `{ obs_time, temperature, dewpoint_temp, wind_speed (kt), wind_direction, visibility (km),
  total_cloud_cover, cloud_cover_1..4 (eighths), cloud_base_1..4 (**m**), precipitation, …,
  station: { block_station, station_call, place: { id, name, coords ("[lon, lat]" string), … } } }`.
- No endpoint returns "each station's latest at a historic T" except `getDataByParam`'s window.

## Sondes (`/sonde`) and lightning (`/surface`) — for later

- Real radiosondes: `get-times?id&start_time&end_time`, `get-by-time?id&time[&interp]`,
  `get-latest-sonde?id`, `get-nearest-sonde?id&time&next` → levels `{ pressure, modelHeight,
  standardHeight, temperature, windDir, windStr, dewPoint, rh, ws, time }` (−9999 = null; a real 0
  also becomes −9999). Stations: `/places/get-sonde-stations`.
- Lightning: `GET /surface/get_lightning?start_time&end_time` → `[{ coords: [[lon, lat]], params,
  obsTime }]`.

## Gaps — our contract vs. the real backend

| Frontend feature | Real backend | Gap |
|---|---|---|
| Map grids, auto local/wide model | Real model names, no bounds endpoint | Frontend must know model names + coverage |
| Map grids at any hour | Height route interpolates; **pressure route exact model times only** | Pressure levels can't step hourly |
| Wind u/v | `WIND` = `[speed_kt, dir_rad]` | Convert on receive |
| Meteogram temp/wind | `POST /api/points_…_in_feet`, 1×1 wraps | **24 h cap** vs our 120 h range; pivot on receive; wind speed only (no direction) |
| Meteogram clouds | No point query (MagenS had one) | Client point-in-polygon over batch states, or backend ask |
| Sounding table | `/model/air_column` | **Exact model time only**, no surface level, 1000 mb first |
| Polygons | Generic event records, DEV/BIG sectors | Rewrite event parsing; haze surface/high → base/top; CB type values unknown |
| Satellite | Two-step list → fileName → image, seconds | **No color channel**; no defaults endpoint; bounds per date |
| Radar loop | Times keyed by time; latest-only GET | **No frame-by-name+time GET** |
| Observations | `getDataByParam` | Shape differs; cloud base (m→ft) and cover need checking in `CLOUD` params |

## Lead decisions (2026-09-28)

- **Real routes.** The frontend calls the real hzy-liba routes; the dev fixture answers them. Each
  difference between the backend and what we want is decided case by case — never a blanket rule.
- **Seconds** on satellite/radar/observations: adopted (no backend ask).
- **Wind:** backend asked for `U`/`V` (ask 1 in [`backend-asks.md`](backend-asks.md)).
- **Radar past frames:** use the heavy `POST /radar/get_wrap_for_entities` per frame (no ask).
- **Meteogram:** asks 3 (cap + direction) and 4 (point events).
- **mb maps + sounding at non-model hours:** ask 2 (interpolation).
- **Models:** real names + the local coverage box hardcoded in the frontend (lead supplies them).
- **Satellite channels:** `IR10.8`, and FLC maybe (ask 5).
- **Time units in the app stay ms**; satellite and radar requests/parses convert seconds at the edge
  (the backend is roughly split; the routes we call are mostly ms).
- **Models:** local = `ECMWF` (archive ECMWF01), wide = `BIG_ECMWF` (ECMWF03). The local coverage
  box is still the placeholder — **ASSUMED** until the lead sends the real one.
- **Sounding table:** the surface row is dropped (air_column has no SFC).
- **Radar negatives** (echoes the cleaning algorithms flagged as noise; the magnitude is real): hidden
  by default, a toggle shows them drawn as their absolute value, same palette.
- **Polygons:** sectors `SECTOR-DEV` = מקומי (default), `SECTOR-BIG` = אזורי, bounds from MagenS.
  Types mirror the wire (`{ type, parameters, events }`), no conversion step. `cloud_eights` → chip
  "2-4/8", opacity from the range's middle. `precip_type`: the six rain types evenly on the 0–1
  severity ramp in listed order; snow types ignored. Haze: surface when `haze_base` is 0/missing,
  else high. TURBULENCE/WIND/SNOW are obsolete — ignored. Still unknown: `cb_type` values and the
  coordinate order (stand-ins marked ASSUMED).
- **Satellite:** אוטו follows `/satellite/getConfigurationNative` (broken in Python → ask 6), sector
  choices are the four real sectors.
- **Observations:** clouds show every reported layer (base m → ft), rain in mm.

## Lead corrections (2026-09-28, second pass)

- `/api` is never the right request. Meteogram + sounding use `/model/air_column_in_between`.
- mb maps snap to the nearest 3 h model time (no interpolation ask).
- Satellite אוטו = `/satellite/getConfiguration` schedule (not getConfigurationNative). FLC exists as a
  `source`.
- CB types SCATTERED / CB / CLOUDY confirmed.
