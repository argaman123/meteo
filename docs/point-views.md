# Point views — chooser, meteogram, sounding table, measure

## Chooser and point (`pages/home/point-menu/`)

- A right-click on the map ALWAYS opens the chooser at the cursor (spartan context menu on
  PointMenu's own div wrapping the map container; a click outside or Esc closes; maplibre's
  `contextmenu` suppresses the browser menu). Items: מטאוגרמה, סונדה בדקירה, מדידת מרחק. Picking a
  view opens it at the clicked point, switching views if one is open.
- `PointService` holds THE point and which `PointView` is open (`showView(view, point)`,
  `hideView()`); each drawer renders on `view() === X`, so views are exclusive by the state's shape
  and keep no point of their own.
- `MapPin` (`directives/map-pin.ts`) is the one way to put an element on the map:
  `<div [appMapPin]="point" movable (moved)="…">` shows it as a maplibre marker while it exists.
  Visuals live in the template; a marker's click never reaches the map.

## Meteogram (`pages/home/meteogram/`)

- A time–height section per tab (x = time, y = 0–45 kft, linear), not a line chart.
- Placement: a drawer (`h-96`) rising out of the time bar, projected into its track column, so
  chart time IS timeline time — one zoom (wheel over the chart zooms both), dragging the chart pans
  the time bar, click = jump. Rise/sink keyframes; the measured `--time-bar-height` shrinks the map
  well. It never takes the menu column.
- Anatomy: a title block (מטאוגרמה + pin + coordinates), a divider, browser-style tabs with icons
  (`hlm-tabs-list variant="browser"`, active tab joined to the chart), the tab's legend pinned
  beside ✕. One continuous background on the bar's card color — no shifts, no past dimming.
- `MeteogramService`: `tab`, `openedTabs` (reset per point — a tab's data is requested only once it
  has been opened at this point; closing releases everything), `range` = the temperature layer's
  24/96 window around the hour-floored now.
  - `column` — one `/model/air_column_in_between` request feeds temperature and wind: each model
    time becomes a `Sounding` and `MeteogramData.fromSoundings` samples it onto a 1,000-ft ladder
    (`Sounding.levelAtHeight`).
  - `clouds` — `/polygon/get_point_events_between_times` (backend ask 2; the backend resolves the
    sector — outside every sector = אין תופעות).
- `MeteogramFrame` — shared frame: now line, map-time line, hover crosshair + chip (time · height ·
  the tab's `hoverText(time, heightFt)`), height strip every 5k ft, an optional `[lanes]` slot under
  the height area (hover there passes `heightFt = NaN`). Owns the `size` signal its children read.
- `MeteogramColormap` — per-pixel colormap at 0.5 resolution with a 0.1-step color cache, plus
  contours from a `MeteogramContours` config (`faintStep` + `marked` levels) traced once per data
  load and re-projected on zoom.
- Temperature tab: `TEMPERATURE_PALETTE`; isotherms every 5 °C + a white 0 °C line.
- Wind tab: `WIND_SPEED_PALETTE` on speed; faint isotachs every 1 m/s + marked white 25 kt and gray
  45 kt (inferred from a photo — confirm); downwind arrows drawn by `WindChart` on its own canvas at
  the data's hours (a 1/3/6/12/24 h step keeping arrows ≥ 40 px apart, rows every 30 px).
  Direction is always computed from interpolated u/v — never interpolate an angle.
- Clouds tab — deliberately flat: one block per event at its real base–top in the polygons' own
  fill, identical consecutive maps merged, the polygon chip text shown only when it fits. Height top
  = tallest cloud rounded up to 5k ft (min 10k). Fog/haze have no heights on the wire, so they ride
  lanes under the height area, labeled by `EventAppearance.name`.
- New views reuse the owning feature's outputs (`EVENT_APPEARANCES[type].style().text`, `.name`,
  palettes, `POLYGONS_LEGEND`); a missing piece is added to the original, never re-derived here.

## Sounding table (`pages/home/sounding-table/`)

- "As if a radiosonde were released at that point." A drawer on the map's end edge (`w-md`,
  widen/narrow keyframes); the measured `--sounding-table-width` insets the map, legend and HUD.
- The air column (one wire object, `AirColumnTime`) is converted in one place:
  `Sounding.fromAirColumn` — levels sorted by pressure, wind kt + radians → u/v m/s. The meteogram
  and the table both build on `Sounding`.
- `/model/air_column_nearest?model&lat&lon&forecasttime=displayTime` (backend ask 3 — the backend
  picks the nearest model time; that time shows in the header). The last sounding stays while the
  next loads (`linkedSignal` over `hasValue()`/`isLoading()`).
- Rows: true geopotential heights every 1,000 ft (labels follow the m/ft setting), as high as the
  data goes, highest first by default (the גובה header toggles; the table always starts at the top).
  No surface row — air_column has none.
- Columns: גובה · לחץ (mb) · תיקון (true height − what a 1013-set altimeter reads,
  `feetAtPressure`; sign convention to confirm) · טמפ׳ (soft palette tint) · טל · לחות (wire RH,
  thin bar) · רוח (downwind arrow + speed; degrees on the arrow's aria-label).
- Look: a small dimmed unit inside every cell, every other column banded, one font weight, faint
  row lines. Alignment is measured in the live DOM to ≤ 0.5 px before showing.
- A Skew-T was built and is parked on branch `skew-t` for a professional's review.

## Measure (`pages/home/measure/`)

- Distance only. Started by the chooser's מדידת מרחק (that spot = the first point). Left-clicks
  add points; handles drag (MapPin); a right-click or Esc clears and ends. Double-click zoom is off
  while measuring. The `Measure` component (handles + Esc) mounts on the home page.
- Measuring is a layer (`layers/general/measurement.ts`) so shared code stays generic: data =
  `{ points, cursor }`; looks = Path (legs + a dashed live leg to the cursor) and Labels (each leg's
  distance at its midpoint); hover = the running total to the cursor.
- Every distance reads `km · arc degrees` (degrees in the coordinates setting's DD/DMS), via
  `@turf/distance`. Nothing persists.

## Rejected (don't re-offer)

- A left-click chooser — it reopened on the closing click.
- A disabled-while-open chooser, right-click-moves-the-point — one rule per gesture.
- Per-view pins, or `meteogram.point() ?? soundingTable.point()` — one PointService.
- Meteogram as a side column, a replacement panel, a floating card, or folder tabs over the map.
- Pressure-scaled height axis — linear, consistent distances.
- Hatch patterns, label backgrounds, outlines or collision placement in the clouds tab; day lines;
  past dimming.
- Screen-fixed wind arrows or DOM icons — canvas arrows at data hours.
- Invented fog/haze heights — lanes.
- Sounding: an ISA-deviation column, a numeric direction column, saturated colored text, heatmap
  cells, units only in headers, merging לחץ/תיקון into the height column, 5,000-ft lines.
- A draw tool — dropped from the plan.
