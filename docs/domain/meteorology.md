# Domain: Meteorology & Data

Domain knowledge for this project, captured as we go. **Treat all domain info as sensitive — never
request classified detail.** Specifics marked *(TBD)* are filled in iteratively by the lead.

## Data sources

- **Global models** (e.g. GFS/ECMWF-class) — base coverage.
- **Regional high-res model** — over the area of responsibility; the view **auto-switches** to it
  when the visible area fits its coverage. Resolution is **consistent** within a source.
- **Observations** — radar, satellite, surface stations, lightning, soundings.
- **Backend formats:** field data arrives as **JSON grids** (`Wrap`); satellite as **PNG imagery** —
  never tiles. See `../backend.md`.
- **Model identity** is internal: auto-switch by coverage; a user-facing model selector only where
  a layer needs it (waves); side-by-side comparison — **never**.

## Spatial & vertical structure

- **Coverage:** usually wide; switches to the better regional model when the view fits it.
- **Vertical:** surface + standard **pressure levels** + heights in **kilofeet** (aviation). Users
  switch levels via a level selector.

## Forecaster-authored content

Meteorologists author (today in the old app; later on our meteorologist site):
- **Polygons** — forecast-event maps, shown here as a map layer (see `polygons.md`).
- **Timeline tables** of data — shown here in the tables/reports subsystem.

The client site only **displays** these published products.

## Warnings

- A **sidebar** lists current and near-future warnings for **areas of interest**, as text with a
  quick **green / yellow / red** status marker per relevant point.
- The corresponding **warning polygons** are their own map layer (a different feature from the forecast polygons).
- **Active notifications** fire (via polling) when warnings appear or change.

## Flight areas

Predefined drawings of areas stored in the backend (e.g. an airport's airstrip). Users pick any
number of them to show on top of all layers. No fly-to, no user-drawn areas.

## Layer types and what they mean

| Layer | Meteorological meaning |
|---|---|
| Colormap fill | A scalar field (temperature, humidity, pressure…) shown as a smooth color gradient |
| Animated particles | A vector field (wind, currents) shown as moving streaks |
| Contours / isolines | Lines of constant value (isobars, isotherms, geopotential height) |
| Wind barbs / arrows | Wind direction + speed glyphs on a grid |
| Raster (satellite/radar) | Imagery; often animated loops |
| Station / point obs | Observations at points (icons + numeric values), e.g. METAR-style |
| Polygons | Warning/advisory/analysis areas (incl. forecaster-authored) |
| Lines / paths | Routes, tracks, fronts |
| Text labels | Place names / values (Hebrew + English, RTL-aware) |

## Point queries & charts

Clicking a point (or drawing a line) can produce — **user chooses, not all at once**:
- **Meteogram** — time series of parameters at a point.
- **Vertical sounding (Skew-T)** — vertical profile at a point/time.
- **Cross-section** — one colored line per active parameter at the selected level, over time.
- **Flight route** — a route clicked on the map → the weather along it (clouds met, wind…).

Plus an always-on **hover readout**: the values of all active layers at the cursor (toggleable).

## Tables / reports (later)

- Tabular forecasts (parameter × time for a location/route).
- Decoded observations (METAR/TAF/synoptic) in readable tables.
- Auto-generated text summaries.
- Custom reports/briefings (formatted output; print/export later).
