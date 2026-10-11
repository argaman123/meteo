# Backend asks

## Routes

1. **U / V wind** — register `U` and `V` as model params (they're already in `ModelParameter`), m/s.
2. **Events at a point** — `GET /polygon/get_point_events_between_times?lat&lon&start_time&end_time` → `[{ startTime, forecastEvents }]`, DISTRIBUTED only, sector resolved from the point (like MagenS `getEventsByPoint`).
3. **Nearest air column** — `GET /model/air_column_nearest?model&lat&lon&forecasttime` → `{ time, airLevelDataList }` for the model time nearest `forecasttime` (like one entry of `air_column_in_between`).
4. **Full-resolution map grids** — honour `reduction` (already in `LimitedData`, unused) on `/model/data-limited` and `/model/data_with_flat_heights_with_limit` instead of the fixed `STANDARD_RESOLUTION = 70`, so a map can come back at the model's native grid (`reduction=N` = every Nth native cell, MagenS's `applyReduction`; SLP already sends `reduction=1`).
5. **`Wrap.limit` start** — `limit()` sets `start_x`/`start_y` to `min_lon`/`min_lat` instead of the first kept cell's lon/lat, shifting a cropped native grid by up to one cell; its `np.arange(n - 1)` also never keeps the last row/column. (We pad full-resolution bboxes by one cell meanwhile.)
6. **Bird radar times** — `get_time_range_to_bird_radars` passes a comma-joined string into `get_entities_in_range`, which iterates it per character; pass the list of `…BIRD` names instead (same for `get_time_range_to_radars?names`).

## Data

7. **Local ECMWF box** — the `ECMWF` (ECMWF01) coverage: min/max lon and lat.
8. **A real polygons map** — one stored `get_latest_polygons_by_time_sector_time_saved_status` response, to confirm the coordinate order (`[lat, lon]`?).
9. **Level lists** — the pressure levels and the heights (ft) each model serves on the map routes.
10. **Rain names** — the Hebrew names of the six rain `precip_type` values (we show וירגה, טפטוף, טפטוף עד גשם בינוני, גשם בינוני, גשם בינוני עד חזק, גשם חזק).
11. **Colors** — the old app's color scales and contour steps per layer (temperature, wind, humidity, waves, sea-level pressure, geopotential) and the radar rain-rate bands.

## Confirm

12. **Grid rows** — every model's `Wrap` is south-first (`ry > 0`), ECMWF included?
13. **Air-column wind** — `windDir` is radians in the math convention (0 = east, counterclockwise)?
14. **Polygons validity** — a map is valid ±1.5 h around its time?
15. **Satellite IR** — the raw PNG is cold = bright, or inverted?
16. **Bird radar cells** — height in meters?
17. **Heights route** — the `height` param is in feet?
18. **Observation clouds** — a station is colored by its largest layer cover?
19. **Sounding תיקון** — true height minus what a 1013-set altimeter reads; is that the sign forecasters expect?
20. **Meteogram isotachs** — the marked wind lines are 25 and 45 kt?
