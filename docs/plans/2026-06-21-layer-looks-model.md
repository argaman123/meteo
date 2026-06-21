# Layer & Looks model — catalog redesign

**Status:** design, drafted 2026-06-21, **pending lead review**. No code until signed off.
**Context:** emerged from the Slice 1 walkthrough, Subject 3 (layer catalog). Replaces the current
catalog where each entry conflates one calculation with one fixed look.

## Why

The current catalog welds a layer's calculation, its single look, and its identity into one object.
We want:

- a clean split between a layer's **calculation** and its **looks**;
- **several looks per layer, shown at once** (e.g. wind particles over a wind-speed colormap);
- an extensible set of look kinds (colormap, particles, contours, low-res polygons, …);
- identity (button name, default look) kept apart from the calculation and the backend parameter
  names — but co-located and easy to edit;
- room to later compute a layer's value from **other layers**, and to drive look selection from
  **site/client presets**.

## The model

Three separated concerns:

1. **Layer — calculation + identity.** Exposes `value(point) → Value`. `Value` is a small **class
   instance** holding the raw components plus its derived helpers and its display text. Sourced now
   from backend parameters; later possibly a function of other layers' values.
2. **Look — one representation the layer offers.** A render *kind* (`colormap | particles |
   contours | polygon | …`) + a **handler** `(value) → look input` + per-look defaults (on/off,
   opacity, order). A layer offers a set; **any number can be active simultaneously**.
3. **Identity.** `label` (button name) and which looks default on — separate from the calculation
   and from backend parameter names.

The handler is the *only* bridge from calculation to look. Deriving speed from `u,v` lives on the
`Value` class; the handlers just read it.

### Examples

```
// wind.layer.ts — calculation, value type, identity
class WindValue {
  constructor(u, v)
  get speed()      → hypot(u, v)
  get direction()  → atan2(...)
  text()           → "12 kt / 240°"      // used by hover
}
WindLayer:  label "רוח";  value(point) → WindValue   // from u,v params

// wind.looks.ts — the representations
particles  (default on)   handler(v: WindValue) → movement from v.u, v.v
colormap   (default off)  handler(v: WindValue) → v.speed
contours   (default off)  handler(v: WindValue) → v.speed
```

```
// temperature.layer.ts
class TemperatureValue { constructor(t);  text() → "21 °C" }
TemperatureLayer:  label "טמפרטורה";  value(point) → TemperatureValue

// temperature.looks.ts
colormap   (default on)   handler(v: TemperatureValue) → v.t
```

## Files

Per parameter, split by concern:

- `layers/model/<name>.layer.ts` — the Layer: calculation, `Value` class, identity.
- `layers/model/<name>.looks.ts` — the looks it offers and their handlers.

Naming open; if a layer grows we can give it a folder. Render kinds (the shared rendering machinery)
stay in `engine/renderers/`; a look binds a kind to a handler.

## Hover

Hover shows each active **layer's** value once, via `value(point).text()` — independent of how many
looks are on. Looks do not affect the readout.

## Downstream consequences (flagged, not part of this design's code)

- **On/off, opacity, order move from per-layer to per-look.** The layers store becomes keyed by
  look; the layer bar lists looks under each layer. This reshapes `LayersStore` and the layer bar.
- The data layer fetches per the parameters a layer's calculation needs (unchanged in spirit).

## Deferred (design accommodates, not built now)

- **Composite calculations:** `value(point)` as a function of other layers' values.
- **Look selection by preset/client;** user interaction stays on/off + (later) opacity/order.

## Open for the implementation plan

- `Value`: a shared base, or per-layer classes only?
- How a look kind declares what input shape it needs, and how a mismatch is caught.
- Exact `LayersStore` / layer-bar reshaping for per-look state.
