# Domain: Units, Coordinates & Time

Reference for the **Units module** and the **Geo module**. Every value rendered anywhere (hover,
tables, charts, readouts) must flow through these — never format raw numbers ad-hoc.

## Units

Switchable: wind speed kt / m/s, geopotential height m / ft. Everything else is fixed (°C, km, mb,
kilofeet for aviation heights…); °F, NM, inHg and km/h are not wanted.

Design notes:
- A single conversion+formatting module owns all of this. Components ask for a value in the user's
  current units; they never convert inline.
- Precision/format per quantity is defined centrally (e.g. wind to whole knots, temp to whole degrees).

## Coordinates

| Format | Use |
|---|---|
| **Lat/Lon decimal** | default machine-readable form |
| **Lat/Lon DMS** | degrees/minutes/seconds for display/input |
| **UTM** | display and **input** |
| **גריד מבצעי** | the military grid — display, **input**, and a **grid overlay** on the map |

Design notes:
- The Geo module owns parsing + formatting for all four, and the גריד מבצעי overlay.
- גריד מבצעי is the old app's algorithm (not MGRS): 1° squares lettered by floored lat/lon over
  29–34°N × 33–36°E, read "lat-minutes lon-minutes square" with floored whole minutes (`04 46 ג`),
  left to right; outside the table it shows DMS.
- UTM reads `36S 667996E 3550689N` (zone + band, whole meters, geodesy); DMS past 84°N / 80°S.
- The ruler's degrees part shows decimal degrees under UTM and גריד מבצעי.
- Search & locate accepts any of these formats as input.

## Time

- **Local time only** (lead 2026-09-23 — replaces the earlier dual Zulu/Local display; no toggle,
  no Zulu anywhere).
- The global time controller spans **real-time + forecast + history**; timestamps everywhere use the
  Geo/time formatting (never ad-hoc).
- *(Local timezone source — fixed per deployment vs browser — TBD, locked once chosen.)*
