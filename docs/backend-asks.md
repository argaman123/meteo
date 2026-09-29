# Backend asks

1. **U / V wind** — register `U` and `V` as model params (they're already in `ModelParameter`), m/s.
2. **Events at a point** — `GET /polygon/get_point_events_between_times?lat&lon&start_time&end_time` → `[{ startTime, forecastEvents }]`, DISTRIBUTED only, sector resolved from the point (like MagenS `getEventsByPoint`).
3. **Nearest air column** — `GET /model/air_column_nearest?model&lat&lon&forecasttime` → `{ time, airLevelDataList }` for the model time nearest `forecasttime` (like one entry of `air_column_in_between`).
