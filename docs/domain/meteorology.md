# Domain: Meteorology & Data

Domain knowledge for this project, captured as we go. **Treat all domain info as sensitive — never
request classified detail.** Specifics marked *(TBD)* are filled in iteratively by the lead.

## Data sources

- **Global models** (e.g. GFS/ECMWF-class) — base coverage.
- **Regional high-res model** — over the area of responsibility; the view **auto-switches** to the
  better/regional model on zoom-in. Resolution is **consistent** within a source.
- **Observations** — radar, satellite, surface stations, lightning, soundings.
- **Current backend formats:** field data arrives as **JSON grids** (several formats); satellite as
  **PNG imagery** — never tiles. (See `decisions.md` → Field data delivery.)
- **Model identity** (model/run) is an internal **layer parameter**: auto-switch by zoom is the only
  behavior now; a user-facing model selector is possible later; side-by-side comparison — **never**.
- Exact model names/sources: *(TBD — provided by the lead as needed.)*

## Spatial & vertical structure

- **Coverage:** usually global; switches to a better regional model on zoom-in.
- **Vertical:** surface + standard **pressure levels** + heights in **kilofeet** (aviation). Users
  switch levels via a level selector.

## Forecaster-authored content (authored elsewhere, displayed here)

A separate team of weathermen authors, in a different tool:
- **Polygons** — shown here as a globe layer (warnings/advisory areas, analysis regions).
- **Timeline tables** of data — shown here in the tables/reports subsystem.

This app only **displays** these published products; it does not author them.

## Warnings

- A **sidebar** lists current and near-future warnings for **areas of interest**, as text with a
  quick **green / yellow / red** status marker per relevant point.
- The corresponding **warning polygons** are their own layer on the globe.
- **Active notifications** fire (via polling) when warnings appear or change.

## Areas of interest (AOIs)

- **Predefined per group** (e.g. a Navy group's operating areas), configured per deployment/preset.
- **User-defined on the fly** (drawn/selected in the moment).
- A **"frame AOI" action** animates the globe, switches to 2D, and zooms to the AOI (primarily to
  set up a clean screenshot).

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
- **Cross-section** — vertical slice along a drawn line.
- **Raw values readout** — the numbers at the point/time.

Plus an always-on **hover readout**: the values of all active layers at the cursor (toggleable).

## Tables / reports (later slices)

- Tabular forecasts (parameter × time for a location/route).
- Decoded observations (METAR/TAF/synoptic) in readable tables.
- Auto-generated text summaries.
- Custom reports/briefings (formatted output; print/export later).
