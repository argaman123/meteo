# Polygons — forecast-event maps (domain knowledge, lead 2026-07-19)

Forecaster-authored polygon maps per sector (a constant square bound to the sector name, saved in
the backend). A new map is issued roughly every 3 hours; each covers its hour ±1. Maps exist only
from now forward. The **main goal: multiple polygons stacked on top of each other must stay
individually recognizable by type** — patterns, colors, and a minimal text chip per polygon.

## Event types (all of them)

- **Cloud** — one event type; the **cloud base** determines the level, and all three are
  inherently the same event:
  - low → horizontal lines, grey background, opacity by eighths on a stronger scale (~0.4–0.9)
  - mid → vertical lines, blue background, opacity ~0.2–0.7
  - high → diagonal lines, cyan-ish background, opacity ~0.2–0.7
- **Precip** — nests *recursively inside a cloud*. Red outline; width by rain amount (4 levels);
  color red→pink by the same level; also gives the polygon text a red outline. Overrides the
  default outline (every polygon otherwise has a thin white outline purely for separation).
- **CB (cumulonimbus)** — nests *recursively inside a precip*. Has severity; background becomes
  red → strong red/pinkish; outline system like rain but stronger; text outline becomes black to
  match the background.
- **Haze** — surface or high. Yellowish → brown; opacity follows the low-cloud rules (surface haze
  = stronger opacity).
- **Fog** — table-like pattern (horizontal + vertical lines), whitish-grey.

## Text chips

Every polygon must carry text, near its center, never clashing with other chips. Super minimal —
numbers only, e.g. `3/8`, `3'-5'` (base–top in thousands of feet, lead 2026-07-20), `30%` (rain
probability).

## Extracted from the old app's `polygon-styles.ts` (photos, 2026-07-19)

The styling file keeps **two presets, NEW and OLD** (style generations, both preserved). NEW values:

| Type | Fill | Opacity range | Pattern (gridWidth) |
|---|---|---|---|
| Low cloud | `#535353` | 0.5–0.95 | — |
| Mid cloud | `#2748a5` | 0.3–0.8 | — |
| High cloud | `#206ea3` | 0.3–0.8 | [0,3] |
| Fog | `#535353` | 0.4–0.7 (indexed by a **visibility table**, minVis/maxVis) | [3,3] grid |
| Haze (surface) | `#ff9800` | 0.95→0.5 (reversed in the file) | — |
| Rum haze (high) | `#ffe33f` | 0.1–0.5 | — |
| Turbulence | `#800080` | 0.5 | — (future type) |
| CB scattered / cb / cloudy | `#ff0000` / `#c30000` / `#800000` | cloud's alpha | — |

- Default polygon outline: white; default label: white text, black outline width 4.
- Precip border: width `3→8` interpolated by a continuous severity; color from a 5-stop ramp
  `#d85283 #e12d5d #e40e0e #c30000 #800000` (pink→maroon).
- Precip label outline: navy `#001d59` width 8 (was red `#a30000` — they changed it).
- CB border: the CB fill color, width `4→8` by CB severity; CB overrides the precip border.
- An `EDITING` style exists (authoring state — the old app also edits polygons; we display only).

Adopted with stand-ins (2026-07-19, lead-approved "go for it"; correct when real values surface):
**fog and haze both carry `minVis`/`maxVis`** (lead, 2026-07-19 — haze is visibility-driven like
fog, which also explains the file's reversed haze range) matched against a shared visibility-band
table in **km** (lead 2026-07-20, e.g. 5–10 km) — our bands (5–10/1–5/0.5–1/0.2–0.5/0–0.2 km) are
invented; cloud cover is spelled
**`eights`** on the wire; precip/CB severity formulas and the pink→maroon ramp direction are
linear stand-ins; `LOW_CLOUD1`'s `1` suffix (more cloud slots?) is not modeled.

## Look decisions from the 2026-07-20 design round (lead)

- **Never smooth/round polygon corners** — the exact shape is what the meteorologist drew. This
  extends to border decoration: scalloped GFA-style cloud edges were offered and rejected
  (2026-07-20) — anything that visually modifies the original shape is bad.
- **No "top fill wins" in overlaps** — forecasters read a stack by its blended colors ("you look
  at a stack and you know which colors are probably behind it").
- **Screenshots are the primary consumption medium** (big-screen viewing + screenshots) —
  animation/hover-only affordances carry limited value; hover niceties are welcome but secondary.
- Reference points researched: aviation GFA charts use **scalloped borders** for cloud areas
  (decorates the exact path — allowed under the shape rule; future try); Windy's warnings layer
  marks each polygon with a small per-phenomenon **symbol** and offers color-by-severity vs
  color-by-type; Meteoalarm uses hatched fills + colored edges (matches our language).

## Standing wish (from the forecasters, old app era)

They asked for richer rain indication — e.g. a small-droplets pattern on top — so the pattern
vocabulary should stay extensible, with a **showcase surface where users can see and choose
styles** (plan.md row).
