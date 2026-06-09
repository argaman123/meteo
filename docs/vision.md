# Product Vision

A **specialized meteorological viewer**: a 3D globe (with a 2D toggle) layered with colorful,
animated weather data, plus tables, summaries, and reports — for a closed/secure internal network.
It resembles Windy on the surface but exists for reasons off-the-shelf tools can't satisfy.

## Why it exists (all four)

- **Proprietary / regional data** — in-house and regional high-res models and sources others lack.
- **Domain-specific tools** — built for defense/aviation/maritime/emergency workflows.
- **Integration** — ties into internal operational systems and data.
- **Security** — runs entirely inside a closed network on sensitive data.

⇒ The architecture must be an **extensible framework for many domain tools and data types**, not a
fixed app.

## Users & deployment

Wide spectrum — **defense/military, aviation & maritime, emergency & public, and casual users** —
served by **one shared deployment**. Per-group differences (e.g. Navy) ride on **presets/config**,
not roles or logins (access is network-trusted).

## It is a viewer, not an authoring tool

A separate team of weathermen authors **polygons and timeline tables** in a **different** app. This
app **publishes and visualizes** those products alongside model data and observations. We do **not**
build authoring/editing here. The on-map draw/measure tools are for the viewer's own ad-hoc use.

## Dominant usage

1. **Explore** layers over a region (pan/zoom, toggle, scrub time).
2. **Point/location forecast** (read details for a place/asset).
3. **Situational monitoring** — always-on, often on control-room walls.
4. **Briefing & decision support** — assemble a picture to drive a go/no-go call.

## Complete capability inventory

| Capability | Detail |
|---|---|
| **Globe + 2D toggle** | 3D sphere default ("globe as canvas"), one-line 2D toggle; tilt/terrain not central |
| **Basemaps** | ArcGIS = background ground ONLY; + self-hosted local basemap (dark/light/colorful) as a fast, uncluttered fallback when ArcGIS is slow or satellite is too cluttered |
| **Layer types** | colormap fills · animated particles · contours/isolines · wind barbs/arrows · raster (satellite/radar loops) · station/point obs (icons+values) · RTL text labels · polygons (incl. warnings) · lines/paths; all composite with order + opacity |
| **Field data** | Encoded data tiles (Windy-style) — client renders colormaps/contours/particles in WebGL |
| **Level selector** | surface + pressure levels + heights in **kilofeet** (aviation) |
| **Time controller** | global; real-time + forecast + history; scrubber + playback; **polling** for latest cycles; per-layer availability windows |
| **Hover readout** | default on (toggleable): text tooltip of **all active layers' values** at the cursor |
| **Click → detail panel** | user **chooses**: meteogram · vertical sounding (Skew-T) · raw values · cross-section along a line (never all at once) |
| **Map tools** | draw/measure (distance/area), define cross-section line, define AOI; search & locate |
| **Coordinates** | Lat/Lon (decimal + DMS) · MGRS (input, display, grid overlay) |
| **Time display** | UTC/Zulu + Local (dual) |
| **Units (switchable)** | wind kt & m/s · temp °C & °F · distance/altitude NM/km/ft/kilofeet · pressure hPa/mb & inHg |
| **Warnings** | sidebar (current + near-future for AOIs, with green/yellow/red status) + warning polygons as a globe layer + active notifications (polling) |
| **Tables / reports** | tabular forecasts · decoded obs (METAR/TAF/synoptic) · auto text summaries · custom reports/briefings (later) |
| **Output** | screenshot-first (users screenshot globe/tables) + "frame AOI" button (auto-animate globe → 2D → zoom to AOI). PDF/print + data export = later |
| **AOIs** | predefined per group + user-defined on the fly |
| **Dashboard / wall mode** | always-on situational view for control-room walls |
| **Presets / theming** | tokens; modern/clean default + "classic/old-look" toggle (minimum) + per-group + possibly custom; bounded, never at the cost of maintainability; stored in localStorage, one per PC |
| **UI/UX approach** | adaptive UI: simple by default, grouped advanced controls for specific groups; light per-user tweaks (pin layers). **UX needs its own design pass — not yet designed** |

## Architecture pillars (each = one unit, clear responsibility, clear interface)

1. **App Shell & Routing** — outer frame; cutover-ready route map; SPA, no SSR.
2. **Map Engine Adapter** — wraps MapLibre + deck.gl + WeatherLayers. Nothing else imports them.
3. **Layer System (declarative registry)** — add a layer = add a definition, not engine code.
4. **Global Time Controller** — signal-store; live/forecast/history; playback; polling.
5. **Data Access Layer** — typed backend clients (polling); model-switch by zoom; encoded-tile, obs,
   warnings endpoints; ArcGIS basemap config. Adapt to the existing contract; request only *additive* endpoints.
6. **Units Module** — switchable conventions; every value flows through it.
7. **Coordinate & Grid (Geo) Subsystem** — lat/lon, DMS, MGRS, grid overlay; Zulu/Local time.
8. **Interaction Layer** — hover readout + click detail panel + map tools.
9. **Warnings Subsystem** — sidebar + polygon layer + notifications.
10. **Charts Subsystem** — meteogram, Skew-T sounding, cross-section.
11. **Reporting & Tables** — tabular forecasts, decoded obs, summaries (later).
12. **Theming & Preset System** — tokens; modern + classic + per-group.
13. **Dashboard / Wall Mode** — always-on situational view.
14. **Quality & Performance discipline** — perf budget; vendoring; strict TS + lint; consistency-is-law.

## Design principle

**Function & data-completeness first, polish second.** Modern/clean by default, but never hide a
needed value for a prettier layout — *"as nice as the need allows."*
