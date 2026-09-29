# Backend asks

1. **U / V wind** — register `U` and `V` as model params (they're already in `ModelParameter`), m/s.
2. **Events at a point** — `GET /polygon/get_point_events_between_times?lat&lon&start_time&end_time` → `[{ startTime, forecastEvents }]`, DISTRIBUTED only, sector resolved from the point (like MagenS `getEventsByPoint`).
3. **Nearest air column** — `GET /model/air_column_nearest?model&lat&lon&forecasttime` → `{ time, airLevelDataList }` for the model time nearest `forecasttime` (like one entry of `air_column_in_between`).
4. **Full-resolution map grids** — honour `reduction` (already in `LimitedData`, unused) on `/model/data-limited` and `/model/data_with_flat_heights_with_limit` instead of the fixed `STANDARD_RESOLUTION = 70`, so a map can come back at the model's native grid (`reduction=N` = every Nth native cell, MagenS's `applyReduction`; SLP already sends `reduction=1`).
