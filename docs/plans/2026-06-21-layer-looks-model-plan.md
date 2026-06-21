# Layer & Looks model — implementation plan (Plan A)

**Goal:** Move the catalog onto the calculation/look/identity split from
[`2026-06-21-layer-looks-model.md`](2026-06-21-layer-looks-model.md), at **exact render parity** —
the same five layers draw the same way, now on the new architecture.

**Architecture:** A `Layer` computes a `Value` (class instance) from its backend parameters. Each
`Look` it carries projects that `Value` into a renderer input via a typed closure (decision **(a)**).
A binding pass turns each active layer's looks into renderer-ready grids; the engine stays a dumb
renderer.

**Staging** (each its own plan, shippable on its own):
- **Plan A (this doc):** the split, at parity. Each layer keeps its single current look. Store and
  layer bar untouched (a layer's active state renders its look).
- **Plan B (later):** multiple looks per layer + per-look on/off/opacity/order in the store and bar
  (e.g. wind = particles + a speed colormap at once).
- **Plan C (later):** new look kinds — contours, low-res polygons.

**Testing** (per `CLAUDE.md`): no committed tests. Pure `Value` math (speed/direction) gets a
**temporary Vitest** check during dev, deleted before close. Everything else: typecheck + lint +
manual render check. No code comments.

**One thing to eyeball in review:** how `Look` constructors take their args (below I use positional
— `new ColormapLook(project, palette, paletteStyle, …)`). If you'd rather a small object, say so
before Task 2.

---

## File structure

- `layers/look.ts` — **new.** `LookKind`, `Look<V>`, `ColormapLook<V>`, `ParticleLook<V>`; the look
  data types (`ColorStop`, the motion interfaces, `ParticleAppearanceName`) move here.
- `layers/layer.ts` — **new.** `Layer<V>` base (id, label, timeWindow, parameters, looks, `value()`);
  `TimeWindow`, `ValueRange`; the runtime `RenderItem`.
- `layers/model/<name>.layer.ts` — **new, per layer.** the `Layer` subclass + its `Value` class.
- `layers/model/<name>.looks.ts` — **new, per layer.** the look(s) it offers.
- `layers/registry.ts` — **modify.** export `Layer[]`.
- `layers/layer-definition.ts` — **delete** at the end.
- `objects/grid.ts` — **modify.** add a factory to build a grid from computed values.
- `engine/renderers/colormap-renderer.ts`, `particle-renderer.ts` — **modify.** take plain render
  inputs (grid(s) + style), not catalog types.
- `engine/map-engine.ts` — **modify.** render per active look, switching on `look.kind`.
- `data/field-data.ts` — **modify.** fetch per `layer.parameters`; build `RenderItem`s through the
  projection bridge.
- `pages/home/hover-readout/hover-readout.ts` — **modify.** read `layer.value(samples).text()`.

---

## Core types (Task 1)

```ts
// layers/look.ts
export interface ColorStop { value: number; color: string; }
export interface CommonMotion { speedScale: number; minSpeedMetersPerSecond: number; maxSpeedMetersPerSecond: number; trailPoints: number; }
export interface FreeMotion extends CommonMotion { strategy: 'free'; lifetimeSeconds: number; straightLine: boolean; densityFactor: number; }
export interface GridMotion extends CommonMotion { strategy: 'grid'; }
export type ParticleMotion = FreeMotion | GridMotion;
export type ParticleAppearanceName = 'trails' | 'arcs';

export type LookKind = 'colormap' | 'particles';

export abstract class Look<V> {
  abstract readonly kind: LookKind;
  abstract readonly defaultActive: boolean;
  abstract readonly defaultOpacity: number;
}

export class ColormapLook<V> extends Look<V> {
  readonly kind = 'colormap' as const;
  constructor(
    readonly project: (value: V) => number,
    readonly palette: ColorStop[],
    readonly paletteStyle: 'smooth' | 'stepped',
    readonly defaultActive: boolean,
    readonly defaultOpacity: number,
    readonly visibleRange?: ValueRange,
  ) { super(); }
}

export class ParticleLook<V> extends Look<V> {
  readonly kind = 'particles' as const;
  constructor(
    readonly project: (value: V) => { u: number; v: number },
    readonly motion: ParticleMotion,
    readonly appearance: ParticleAppearanceName,
    readonly lineWidthPixels: number,
    readonly defaultActive: boolean,
    readonly defaultOpacity: number,
  ) { super(); }
}
```

```ts
// layers/layer.ts
export interface TimeWindow { backHours: number; forwardHours: number; stepHours: number; }
export interface ValueRange { min: number; max: number; }

export abstract class Layer<V = unknown> {
  abstract readonly id: string;
  abstract readonly label: string;
  abstract readonly parameters: string[];
  abstract readonly looks: Look<V>[];
  readonly timeWindow: TimeWindow = { backHours: 24, forwardHours: 96, stepHours: 3 };
  abstract value(samples: Record<string, number>): V;
}

// What the engine renders: one active look with its grids already projected.
export interface RenderItem {
  id: string;            // `${layer.id}:${lookIndex}`
  look: Look<unknown>;
  grids: Grid[];         // colormap → [scalar]; particles → [u, v]
  opacity: number;
  order: number;
}
```

The generic `V` is checked where a look is constructed (the `.looks.ts` file, where `V` is the
concrete `Value`); the registry holds `Layer<unknown>`, so the projection closure type-checks at
authoring and erases at the boundary.

- [ ] Write `layers/look.ts` and `layers/layer.ts`. Typecheck (will fail until consumers move — that
  is expected; this task just lands the types). Commit.

---

## Task 2 — Grid factory

**File:** `objects/grid.ts`

Add a way to build a grid sharing another's geometry but with computed values, for projected fields.

```ts
static fromValues(template: Grid, data: Float32Array): Grid {
  const grid: Grid = Object.create(Grid.prototype);
  (grid as { info: Grid['info'] }).info = template.info;
  (grid as { bounds: Grid['bounds'] }).bounds = template.bounds;
  (grid as { width: number }).width = template.width;
  (grid as { height: number }).height = template.height;
  (grid as { data: Float32Array }).data = data;
  return grid;
}
```

- [ ] Add the factory. Temporary Vitest: `Grid.fromValues(t, data).valueAt(...)` matches a known
  cell. Run, pass, commit. (Test deleted in Task 9.)

---

## Task 3 — The projection bridge

**File:** `data/field-data.ts` (or a small `layers/render-binding.ts` if it reads cleaner)

For one active layer and its fetched grids, produce a `RenderItem` per look. All of a layer's
parameter grids share geometry (same model/time/bbox); use `grids[parameters[0]]` as the template.

```ts
function buildRenderItems(layer: Layer, grids: Record<string, Grid>, opacity: number, order: number): RenderItem[] {
  const template = grids[layer.parameters[0]];
  const cells = template.width * template.height;
  return layer.looks.map((look, index) => {
    const id = `${layer.id}:${index}`;
    if (look.kind === 'colormap') {
      const out = new Float32Array(cells);
      for (let i = 0; i < cells; i++) out[i] = (look as ColormapLook<unknown>).project(layer.value(samplesAt(layer, grids, i)));
      return { id, look, grids: [Grid.fromValues(template, out)], opacity, order };
    }
    const u = new Float32Array(cells), v = new Float32Array(cells);
    for (let i = 0; i < cells; i++) {
      const m = (look as ParticleLook<unknown>).project(layer.value(samplesAt(layer, grids, i)));
      u[i] = m.u; v[i] = m.v;
    }
    return { id, look, grids: [Grid.fromValues(template, u), Grid.fromValues(template, v)], opacity, order };
  });
}

function samplesAt(layer: Layer, grids: Record<string, Grid>, i: number): Record<string, number> {
  const s: Record<string, number> = {};
  for (const p of layer.parameters) s[p] = grids[p].data[i];
  return s;
}
```

- [ ] Add the bridge. Typecheck. Commit. (Manual render check happens in Task 8.)

---

## Task 4 — Convert the three colormap layers

For `temperature`, `windSpeed`, `waveHeight` — each becomes a `.layer.ts` (Layer + Value) and a
`.looks.ts` (one `ColormapLook`). Example (temperature; the other two follow the same shape with
their own palette / `visibleRange`):

```ts
// layers/model/temperature.layer.ts
export class TemperatureValue {
  constructor(readonly celsius: number) {}
  text(): string { return formatNumber(this.celsius, 0, '°C'); }
}

export class TemperatureLayer extends Layer<TemperatureValue> {
  readonly id = 'temperature';
  readonly label = 'טמפרטורה';
  readonly parameters = ['temperature'];
  readonly looks = temperatureLooks;
  value(s: Record<string, number>): TemperatureValue { return new TemperatureValue(s['temperature']); }
}
```

```ts
// layers/model/temperature.looks.ts
export const temperatureLooks = [
  new ColormapLook<TemperatureValue>(v => v.celsius, TEMPERATURE_PALETTE, 'smooth', false, 0.45),
];
```

(`windSpeed`: `defaultActive` true, opacity 0.55; `waveHeight`: stepped palette, opacity 0.6,
`visibleRange { min: 0.2, max: 99 }`. Palettes copied verbatim from the current model files.)

- [ ] Convert the three. Typecheck. Commit.

---

## Task 5 — Convert the two particle layers

`wind` and `waves`. The `Value` holds the derived helpers and `text()`:

```ts
// layers/model/wind.layer.ts
export class WindValue {
  constructor(readonly u: number, readonly v: number) {}
  get speed(): number { return metersPerSecondToKnots(Math.hypot(this.u, this.v)); }
  get direction(): number { return ((Math.atan2(-this.u, -this.v) * 180) / Math.PI + 360) % 360; }
  text(): string {
    if (Number.isNaN(this.u) || Number.isNaN(this.v)) return MISSING_VALUE_TEXT;
    return `${formatNumber(this.speed, 0, ' kt')} / ${formatNumber(this.direction, 0, '°')}`;
  }
}

export class WindLayer extends Layer<WindValue> {
  readonly id = 'wind';
  readonly label = 'רוח';
  readonly parameters = ['u', 'v'];
  readonly looks = windLooks;
  value(s: Record<string, number>): WindValue { return new WindValue(s['u'], s['v']); }
}
```

```ts
// layers/model/wind.looks.ts
export const windLooks = [
  new ParticleLook<WindValue>(v => ({ u: v.u, v: v.v }), WIND_MOTION, 'trails', 1.875, true, 0.9),
];
```

(`waves`: `waveU`/`waveV`, free-strategy `WAVES_MOTION`, `'arcs'`, width 1.5, default off, opacity
0.85; its `text()` reads height in metres — `formatNumber(Math.hypot(u, v), 1, ' m')` + direction.)

- [ ] Convert both. Temporary Vitest on `WindValue.speed`/`.direction` against known u,v. Run, pass.
  Commit.

---

## Task 6 — Registry

**File:** `layers/registry.ts`

```ts
export const layerRegistry: Layer[] = [
  new TemperatureLayer(), new WaveHeightLayer(), new WavesLayer(), new WindSpeedLayer(), new WindLayer(),
];
export function registryEntry(id: string): Layer | undefined { return layerRegistry.find(l => l.id === id); }
```

- [ ] Update. `TimeStore` already reads `registryEntry(id)?.timeWindow` — still valid. Typecheck. Commit.

---

## Task 7 — Engine + renderers

**Files:** `engine/renderers/colormap-renderer.ts`, `particle-renderer.ts`, `engine/map-engine.ts`

Renderers take plain inputs (no catalog types). `map-engine` keeps a `RenderItem[]`, sorts by
`order`, and switches on `look.kind`:

```ts
private toDeckLayer(item: RenderItem): Layer {
  if (item.look.kind === 'colormap') {
    const look = item.look as ColormapLook<unknown>;
    return renderColormapLayer({ id: item.id, grid: item.grids[0], palette: look.palette, paletteStyle: look.paletteStyle, visibleRange: look.visibleRange, opacity: item.opacity }, this.quality.textureMaxDimension());
  }
  const look = item.look as ParticleLook<unknown>;
  const sizeScale = this.zoomScale();
  const width = look.lineWidthPixels * this.particleSettings.widthScale() * sizeScale;
  return renderParticleLayer(item.id, look.appearance, item.opacity, this.particleSystem(item, look), width, sizeScale);
}
```

`particleSystem` keys by `item.id`, reads `item.grids[0]` (u) and `item.grids[1]` (v) and `look.motion`.
`addLayer`/`removeLayer`/`updateAnimationLoop` key by `item.id` and check `look.kind === 'particles'`.

- [ ] Rewire engine + both renderers. Typecheck. Commit.

---

## Task 8 — Data layer + hover, then verify render

**Files:** `data/field-data.ts`, `pages/home/hover-readout/hover-readout.ts`

- `field-data`: fetch per `layer.parameters`; for each active layer build `RenderItem`s via Task 3
  and hand them to the engine (replacing per-entry `LayerDefinition`).
- `hover`: per active layer, `layer.value(samplesAtCursor).text()` (sample each parameter grid at
  the cursor with `valueAt(lon, lat, 'bilinear')`).

- [ ] Rewire both. **Manual check:** run the app — temperature/windSpeed/waveHeight colormaps,
  wind/waves particles, and the hover readout all match the pre-refactor look. Commit.

---

## Task 9 — Cleanup

- [ ] Delete `layers/layer-definition.ts`. Delete the temporary Vitest files.
- [ ] `grep` for `layer-definition`, `LayerCatalogEntry`, `LayerDefinition`, `layerParameters` — no
  hits in `src/`.
- [ ] Typecheck + lint clean. Final manual render check. Commit.

---

## Self-review notes

- **Spec coverage:** calculation/look/identity split (Tasks 1, 4, 5); value-class + `text()` (4, 5,
  8); typed projection per look (1, 3); several-looks-per-layer is *supported* by `looks: Look[]` +
  per-look `RenderItem`s though only one look each is wired (Plan B turns on the rest). Deferred
  items (composite calc, preset selection, per-look UI, contours/polygons) are explicitly out.
- **Open:** `Look` constructor ergonomics (flagged up top); grid geometry assumed aligned across a
  layer's parameters (true for our backend — same model/time/bbox).
