# Backend asks

1. **U / V wind** — register `U` and `V` as model params (they're already in `ModelParameter`), m/s.
2. **Events at a point** — `GET /polygon/get_point_events_between_times?lat&lon&start_time&end_time` → `[{ startTime, forecastEvents }]`, DISTRIBUTED only, sector resolved from the point (like MagenS `getEventsByPoint`).
3. **Nearest air column** — `GET /model/air_column_nearest?model&lat&lon&forecasttime` → `{ time, airLevelDataList }` for the model time nearest `forecasttime` (like one entry of `air_column_in_between`).
4. **Full-resolution map grids** — honour `reduction` (already in `LimitedData`, unused) on `/model/data-limited` and `/model/data_with_flat_heights_with_limit` instead of the fixed `STANDARD_RESOLUTION = 70`, so a map can come back at the model's native grid (`reduction=N` = every Nth native cell, MagenS's `applyReduction`; SLP already sends `reduction=1`).
5. **`Wrap.limit` start** — `limit()` sets `start_x`/`start_y` to `min_lon`/`min_lat` instead of the first kept cell's lon/lat, shifting a cropped native grid by up to one cell; its `np.arange(n - 1)` also never keeps the last row/column. (We pad full-resolution bboxes by one cell meanwhile.)
6. **Bird radar times** — `get_time_range_to_bird_radars` passes a comma-joined string into `get_entities_in_range`, which iterates it per character; pass the list of `…BIRD` names instead (same for `get_time_range_to_radars?names`).
