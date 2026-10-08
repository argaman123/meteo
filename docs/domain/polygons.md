# Polygons — forecast-event maps (domain knowledge)

Forecaster-authored polygon maps per sector, issued about every 3 hours, each covering its hour
±1; maps exist only from now forward. The main goal: **stacked polygons stay individually
recognizable by type** — fill color, pattern, outline, and a minimal text chip per polygon.
Implementation: [../layers.md](../layers.md) (Polygons) and [../engine.md](../engine.md).

## Event types

- **Cloud** — one event type; the cloud base decides the level (low / mid / high). Opacity grows
  with cover (eighths).
- **Precip** — nests inside a cloud. Colors the outline (pink → maroon by rain type, width 3 → 8
  px) and gives the chip text a navy outline; overrides the default thin separation outline.
- **CB** — nests inside a cloud or its precip. Fill becomes red → dark red by CB type (at the
  cloud's alpha), outline = that color, width 4 → 8 px by severity.
- **Haze** — surface (orange, stronger) or high (yellow, fainter); opacity by visibility band.
- **Fog** — gray with a grid pattern; opacity by visibility band.

## The old app's `polygon-styles.ts` (photos, NEW preset)

| Type | Fill | Opacity range | Pattern |
|---|---|---|---|
| Low cloud | `#535353` | 0.5–0.95 | — |
| Mid cloud | `#2748a5` | 0.3–0.8 | — |
| High cloud | `#206ea3` | 0.3–0.8 | vertical lines |
| Fog | `#535353` | 0.4–0.7 by visibility table | grid |
| Haze (surface) | `#ff9800` | 0.5–0.95 | — |
| Haze (high) | `#ffe33f` | 0.1–0.5 | — |
| Turbulence | `#800080` | 0.5 | — (obsolete on the wire) |
| CB scattered / cb / cloudy | `#ff0000` / `#c30000` / `#800000` | the cloud's alpha | — |

- Default outline white (we use the adaptive map ink), default label white with a black outline.
- Precip ramp `#d85283 #e12d5d #e40e0e #c30000 #800000`; precip label outline navy `#001d59`.
- An OLD preset and an `EDITING` style also exist there (we only display).

Stand-ins (correct when real values surface): the visibility bands (5–10 / 1–5 / 0.5–1 / 0.2–0.5 /
0–0.2 km), linear severity formulas, the precip ramp direction.

## Look rules (lead)

- Never smooth, round or decorate polygon edges — the drawn shape is what the meteorologist drew.
- No "top fill wins" in overlaps — forecasters read a stack by its blended colors.
- Chips are minimal: `3/8`, `3'-5'` (base–top in thousands of feet), `30%` (precip probability),
  `5-10 km` (visibility band).
- Screenshots on big screens are the main consumption medium; hover is secondary.
- Forecasters once asked for richer rain indication (a droplets pattern) — keep the pattern
  vocabulary extensible, with a future style showcase.
