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
| **MGRS** | military grid reference system — display, **input**, and a **grid overlay** on the map |

Design notes:
- The Geo module owns parsing + formatting for all three, and the MGRS grid overlay.
- Search & locate accepts any of these formats as input.

## Time

- **Local time only** (lead 2026-09-23 — replaces the earlier dual Zulu/Local display; no toggle,
  no Zulu anywhere).
- The global time controller spans **real-time + forecast + history**; timestamps everywhere use the
  Geo/time formatting (never ad-hoc).
- *(Local timezone source — fixed per deployment vs browser — TBD, locked once chosen.)*
