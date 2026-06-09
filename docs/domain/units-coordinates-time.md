# Domain: Units, Coordinates & Time

Reference for the **Units module** and the **Geo module**. Every value rendered anywhere (hover,
tables, charts, readouts) must flow through these — never format raw numbers ad-hoc.

## Units (switchable by user/group)

| Quantity | Units to support | Notes |
|---|---|---|
| **Wind speed** | knots, m/s (and km/h where useful) | knots for aviation/maritime; m/s metric |
| **Temperature** | °C, °F (Kelvin where relevant) | |
| **Distance / altitude** | NM, km, feet, **kilofeet** | NM nautical; kilofeet for aviation heights |
| **Pressure** | hPa / mb, inHg | hPa and mb are numerically identical |

Design notes:
- A single conversion+formatting module owns all of this. Components ask for a value in the user's
  current units; they never convert inline.
- Unit choice is part of the active **preset** (stored in localStorage, one per PC).
- Precision/format per quantity is defined centrally (e.g. wind to whole knots, temp to whole degrees)
  — *(exact formats TBD, locked once chosen.)*

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

- **Zulu (UTC)** and **Local** shown together (dual display).
- The global time controller spans **real-time + forecast + history**; timestamps everywhere use the
  Geo/time formatting (never ad-hoc), and respect Zulu/Local.
- *(Local timezone source — fixed per deployment vs browser — TBD, locked once chosen.)*
