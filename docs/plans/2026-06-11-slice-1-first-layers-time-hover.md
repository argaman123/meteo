# Slice 1 — First Layers, Time & Hover — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved Slice 1 spec ([`docs/specs/slice-1.md`](../specs/slice-1.md)):
first-party colormap + CPU-particle renderers, layer registry, bbox-windowed continuous-timeline
data access with a dev interceptor mock, global time scrubber, hover readout + minimal Units
module, and the v1 UI chrome — 2D only.

**Architecture:** Data flows one direction: signal-stores (`TimeStore`, `LayersStore`) +
engine camera signals → `FieldData` (httpResource per layer-parameter) → engine renders
declarative definitions. The dev mock is an HTTP interceptor registered only through
`environment.development.ts` (swapped out of prod builds by `fileReplacements`).

**Tech Stack:** Angular 22 (zoneless, signals, `@Service`, `httpResource`), MapLibre GL 5,
deck.gl 9.3 (`BitmapLayer`, `LineLayer` from `@deck.gl/layers`), Tailwind 4, Vitest (temporary
checks only — deleted in the final task per project testing policy).

**Project-law reminders for every task (CLAUDE.md):** no code comments; three-file components;
logical CSS only (`start-*`/`end-*`, never left/right — exception: positioning the hover tooltip
at physical cursor pixel coordinates); descriptive names; engine libraries imported only under
`src/app/engine/`; product code never imports from `src/app/dev/` (one recorded exception:
`environment.development.ts`).

---

## Task 1: Time-dimensioned fixtures + wave grid + manifest

**Files:**
- Modify: `tools/generate-fixtures.ts`
- Generated output: `public/fixtures/models/{wide,local}/<parameter>_<±HHH>.json`, `public/fixtures/models/manifest.json`

- [ ] **Step 1: Rewrite the generator's time/parameter scaffolding**

In `tools/generate-fixtures.ts`, replace the constants block (`FORECAST_HOURS`, `RUN_TIME`,
`Parameter`, `UNITS`) with:

```ts
const STEP_HOURS = 3;
const BACK_HOURS = 24;
const FORWARD_HOURS = 96;
const FRAME_HOURS: number[] = [];
for (let h = -BACK_HOURS; h <= FORWARD_HOURS; h += STEP_HOURS) FRAME_HOURS.push(h);

const RUN_TIME_UNIX_SECONDS =
  Math.floor(Date.now() / 1000 / (STEP_HOURS * 3600)) * (STEP_HOURS * 3600);
const RUN_TIME_ISO = new Date(RUN_TIME_UNIX_SECONDS * 1000).toISOString();

type Parameter = 'temperature' | 'windSpeed' | 'windDirection' | 'waveHeight';

const UNITS: Record<Parameter, string> = {
  temperature: 'C',
  windSpeed: 'kt',
  windDirection: 'deg',
  waveHeight: 'm',
};
```

- [ ] **Step 2: Add the wave field with land = null**

Add below `temperatureAt` (the land mask is deliberately fake — deterministic blobs):

```ts
function isLand(lat: number, lon: number): boolean {
  return Math.sin((lat - 10) / 8) * Math.cos((lon - 20) / 14) > 0.45;
}

function waveHeightAt(lat: number, lon: number, hours: number): number {
  const jet = jetLatitude(lon, hours);
  const swell = 1.6 + 1.4 * Math.sin(lon / 15 + hours / 12) * Math.cos(lat / 20);
  const storm = 1.8 * Math.exp(-Math.abs(lat - jet) / 6);
  return Math.max(0, swell + storm);
}
```

Change `field` to return `number | null`:

```ts
function field(lat: number, lon: number, hours: number, kind: Parameter): number | null {
  if (kind === 'waveHeight') {
    return isLand(lat, lon) ? null : round1(waveHeightAt(lat, lon, hours));
  }
  if (kind === 'temperature') return round1(temperatureAt(lat, lon, hours));
  const wind = windAt(lat, lon, hours);
  if (kind === 'windSpeed') return round1(wind.speedKnots);
  return round1(wind.directionDegrees);
}
```

Update the `values` row type from `number[]` to `(number | null)[]` (two places: the `row`
variable and the `values` variable in the generation loop).

- [ ] **Step 3: Emit frames across the window + the manifest, with signed filenames**

Replace the model/parameter loop's inner `for (const hours of FORECAST_HOURS)` with
`for (const hours of FRAME_HOURS)`, replace `runTime: RUN_TIME` with `runTime: RUN_TIME_ISO`,
and replace the `writeFileSync` filename with a signed name via this helper (add it above the
loop):

```ts
function fixtureFileName(parameter: string, hours: number): string {
  const sign = hours < 0 ? '-' : '+';
  return `${parameter}_${sign}${String(Math.abs(hours)).padStart(3, '0')}.json`;
}
```

```ts
writeFileSync(`${dir}/${fixtureFileName(parameter, hours)}`, JSON.stringify(doc));
```

After the models loop (before the observations section), write the manifest:

```ts
writeFileSync(
  'public/fixtures/models/manifest.json',
  JSON.stringify({
    runTimeUnixSeconds: RUN_TIME_UNIX_SECONDS,
    stepHours: STEP_HOURS,
    backHours: BACK_HOURS,
    forwardHours: FORWARD_HOURS,
  }),
);
```

The observations section still calls `field(lat, lon, 0, parameter)` for `temperature`/
`windSpeed` only — those never return null; leave it as is.

- [ ] **Step 4: Regenerate and sanity-check**

Run: `npm run fixtures`
Expected: no errors. Then verify:
`Get-ChildItem public/fixtures/models/wide | Measure-Object` → 164 files (4 parameters × 41
frames) and `manifest.json` exists at `public/fixtures/models/manifest.json` with the four keys.
Spot-open `public/fixtures/models/wide/waveHeight_-024.json` — `values` contains both numbers
and `null`s.

- [ ] **Step 5: Verify the spike still runs (old filenames still exist for +000/+006/+012)**

Run: `npm start`, open `http://localhost:4200` — temperature + wind layers still render.

- [ ] **Step 6: Commit**

```bash
git add tools/generate-fixtures.ts public/fixtures
git commit -m "feat: time-dimensioned fixtures (-24h..+96h), wave grid with nulls, manifest"
```

---

## Task 2: Pure helpers — bbox, time, null-aware grid parsing + sampling

**Files:**
- Create: `src/app/utils/bbox.ts`, `src/app/utils/time.ts`
- Modify: `src/app/types/field-grid.ts`, `src/app/utils/grids.ts`
- Test (temporary): `src/app/utils/bbox.spec.ts`, `src/app/utils/time.spec.ts`, `src/app/utils/grids.spec.ts`

- [ ] **Step 1: Update the backend contract types**

Replace `src/app/types/field-grid.ts` with:

```ts
export type Bounds = [number, number, number, number];

export interface FieldGridDocument {
  parameter: string;
  level: string;
  units: string;
  runTime: string;
  forecastHours: number;
  startLat: number;
  startLon: number;
  deltaLat: number;
  deltaLon: number;
  rows: number;
  cols: number;
  values: (number | null)[][];
}

export interface FieldGrid {
  parameter: string;
  units: string;
  bounds: Bounds;
  width: number;
  height: number;
  data: Float32Array;
}

export interface VectorField {
  bounds: Bounds;
  width: number;
  height: number;
  data: Float32Array;
}
```

(`runTime`/`forecastHours` leave `FieldGrid` — the continuous timeline makes them transport
metadata only.)

- [ ] **Step 2: Write the failing temp tests**

`src/app/utils/bbox.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { containsBounds, expandBounds } from './bbox';

describe('expandBounds', () => {
  it('pads each side by the factor of the span', () => {
    expect(expandBounds([10, 20, 30, 40], 0.25)).toEqual([5, 15, 35, 45]);
  });
  it('clamps latitude to the mercator-safe range', () => {
    expect(expandBounds([0, -84, 10, 84], 0.5)[1]).toBe(-85);
    expect(expandBounds([0, -84, 10, 84], 0.5)[3]).toBe(85);
  });
});

describe('containsBounds', () => {
  it('is true when inner fits inside outer', () => {
    expect(containsBounds([0, 0, 10, 10], [1, 1, 9, 9])).toBe(true);
  });
  it('is false when inner crosses any edge', () => {
    expect(containsBounds([0, 0, 10, 10], [1, 1, 11, 9])).toBe(false);
  });
});
```

`src/app/utils/time.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { clampToRange, snapToStep } from './time';

describe('snapToStep', () => {
  it('snaps to the nearest step boundary', () => {
    expect(snapToStep(10_800 + 5_000, 3)).toBe(10_800);
    expect(snapToStep(10_800 + 6_000, 3)).toBe(21_600);
  });
});

describe('clampToRange', () => {
  it('clamps below, inside, above', () => {
    expect(clampToRange(-5, 0, 10)).toBe(0);
    expect(clampToRange(5, 0, 10)).toBe(5);
    expect(clampToRange(15, 0, 10)).toBe(10);
  });
});
```

`src/app/utils/grids.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FieldGridDocument } from '../types/field-grid';
import { parseFieldGrid, sampleGrid } from './grids';

const doc: FieldGridDocument = {
  parameter: 'temperature',
  level: 'surface',
  units: 'C',
  runTime: '2026-06-11T00:00Z',
  forecastHours: 0,
  startLat: 40,
  startLon: 10,
  deltaLat: -10,
  deltaLon: 10,
  rows: 3,
  cols: 3,
  values: [
    [0, 10, 20],
    [10, 20, 30],
    [null, 30, 40],
  ],
};

describe('parseFieldGrid', () => {
  it('computes bounds with row 0 = north and converts null to NaN', () => {
    const grid = parseFieldGrid(doc);
    expect(grid.bounds).toEqual([10, 20, 30, 40]);
    expect(grid.data[0]).toBe(0);
    expect(Number.isNaN(grid.data[6])).toBe(true);
  });
});

describe('sampleGrid', () => {
  const grid = parseFieldGrid(doc);
  it('returns exact values on grid points', () => {
    expect(sampleGrid(grid, 10, 40)).toBe(0);
    expect(sampleGrid(grid, 30, 20)).toBe(40);
  });
  it('interpolates bilinearly between points', () => {
    expect(sampleGrid(grid, 15, 40)).toBe(5);
    expect(sampleGrid(grid, 15, 35)).toBe(10);
  });
  it('returns NaN outside the grid and near missing cells', () => {
    expect(Number.isNaN(sampleGrid(grid, 9, 40))).toBe(true);
    expect(Number.isNaN(sampleGrid(grid, 12, 22))).toBe(true);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `bbox.ts`/`time.ts` don't exist, `sampleGrid` not exported.

- [ ] **Step 4: Implement the helpers**

`src/app/utils/bbox.ts`:

```ts
import { Bounds } from '../types/field-grid';

const MERCATOR_LATITUDE_LIMIT = 85;

export function expandBounds(bounds: Bounds, factor: number): Bounds {
  const [west, south, east, north] = bounds;
  const lonPadding = (east - west) * factor;
  const latPadding = (north - south) * factor;
  return [
    west - lonPadding,
    Math.max(-MERCATOR_LATITUDE_LIMIT, south - latPadding),
    east + lonPadding,
    Math.min(MERCATOR_LATITUDE_LIMIT, north + latPadding),
  ];
}

export function containsBounds(outer: Bounds, inner: Bounds): boolean {
  return (
    inner[0] >= outer[0] && inner[1] >= outer[1] && inner[2] <= outer[2] && inner[3] <= outer[3]
  );
}
```

`src/app/utils/time.ts`:

```ts
const localTimeFormat = new Intl.DateTimeFormat('he-IL', {
  weekday: 'short',
  day: 'numeric',
  month: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function snapToStep(unixSeconds: number, stepHours: number): number {
  const stepSeconds = stepHours * 3600;
  return Math.round(unixSeconds / stepSeconds) * stepSeconds;
}

export function clampToRange(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function formatLocalTime(unixSeconds: number): string {
  return localTimeFormat.format(new Date(unixSeconds * 1000));
}
```

In `src/app/utils/grids.ts`: in `parseFieldGrid`, change the assignment line to convert null:

```ts
      const value = doc.values[r][c];
      data[r * doc.cols + c] = value === null ? NaN : value;
```

Add `sampleGrid` and `sampleVectorField` (bilinear; row 0 = north; NaN if outside or any corner
missing), and `mapGridValues`:

```ts
export function sampleGrid(grid: FieldGrid, lon: number, lat: number): number {
  const [west, south, east, north] = grid.bounds;
  const col = ((lon - west) / (east - west)) * (grid.width - 1);
  const row = ((north - lat) / (north - south)) * (grid.height - 1);
  if (col < 0 || row < 0 || col > grid.width - 1 || row > grid.height - 1) return NaN;
  const c0 = Math.floor(col);
  const r0 = Math.floor(row);
  const c1 = Math.min(c0 + 1, grid.width - 1);
  const r1 = Math.min(r0 + 1, grid.height - 1);
  const fc = col - c0;
  const fr = row - r0;
  const v00 = grid.data[r0 * grid.width + c0];
  const v01 = grid.data[r0 * grid.width + c1];
  const v10 = grid.data[r1 * grid.width + c0];
  const v11 = grid.data[r1 * grid.width + c1];
  const top = v00 * (1 - fc) + v01 * fc;
  const bottom = v10 * (1 - fc) + v11 * fc;
  return top * (1 - fr) + bottom * fr;
}

export function sampleVectorField(
  field: VectorField,
  lon: number,
  lat: number,
): [number, number] {
  const [west, south, east, north] = field.bounds;
  const col = ((lon - west) / (east - west)) * (field.width - 1);
  const row = ((north - lat) / (north - south)) * (field.height - 1);
  if (col < 0 || row < 0 || col > field.width - 1 || row > field.height - 1) return [NaN, NaN];
  const c = Math.round(col);
  const r = Math.round(row);
  const index = (r * field.width + c) * 2;
  return [field.data[index], field.data[index + 1]];
}

export function mapGridValues(
  grid: FieldGrid,
  transform: (value: number) => number,
  units: string,
): FieldGrid {
  const data = new Float32Array(grid.data.length);
  for (let i = 0; i < grid.data.length; i++) data[i] = transform(grid.data[i]);
  return { ...grid, units, data };
}
```

(NaN corners propagate through the bilinear arithmetic to NaN automatically — no special case
needed. `parseFieldGrid` no longer copies `runTime`/`forecastHours`; remove those two lines from
its return object. Keep `toVectorField` and `downsampleGrid` untouched for now — Task 8 deletes
`downsampleGrid` with the old renderer.)

- [ ] **Step 5: Run tests + typecheck**

Run: `npm test` → all specs PASS. Run: `npm run typecheck` → clean (the spike files don't touch
the removed `FieldGrid` fields).

- [ ] **Step 6: Commit**

```bash
git add src/app/types/field-grid.ts src/app/utils
git commit -m "feat: bbox/time helpers, null-aware grid parsing, bilinear sampling (temp specs)"
```

---

## Task 3: Minimal Units module

**Files:**
- Create: `src/app/units/units.ts`
- Delete: `src/app/utils/units.ts`
- Modify: `src/app/dev/spike/spike-data.ts`
- Test (temporary): `src/app/units/units.spec.ts`

- [ ] **Step 1: Write the failing temp test**

`src/app/units/units.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  MISSING_VALUE_TEXT,
  formatParameterValue,
  formatWind,
  knotsToMetersPerSecond,
  metersPerSecondToKnots,
} from './units';

describe('conversions', () => {
  it('round-trips knots and m/s', () => {
    expect(knotsToMetersPerSecond(10)).toBeCloseTo(5.14444, 4);
    expect(metersPerSecondToKnots(knotsToMetersPerSecond(7))).toBeCloseTo(7, 6);
  });
});

describe('formatParameterValue', () => {
  it('applies the central precision rules per parameter', () => {
    expect(formatParameterValue('temperature', 23.4)).toBe('23°C');
    expect(formatParameterValue('windSpeed', 12.3)).toBe('12 kt');
    expect(formatParameterValue('windDirection', 240.4)).toBe('240°');
    expect(formatParameterValue('waveHeight', 1.42)).toBe('1.4 m');
  });
  it('shows the missing marker for NaN', () => {
    expect(formatParameterValue('temperature', NaN)).toBe(MISSING_VALUE_TEXT);
  });
});

describe('formatWind', () => {
  it('combines speed and direction', () => {
    expect(formatWind(12.3, 240.4)).toBe('12 kt / 240°');
  });
  it('is missing if either part is missing', () => {
    expect(formatWind(NaN, 240)).toBe(MISSING_VALUE_TEXT);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test` → FAIL (`src/app/units/units.ts` missing).

- [ ] **Step 3: Implement the module**

`src/app/units/units.ts`:

```ts
const METERS_PER_SECOND_PER_KNOT = 0.514444;

export const MISSING_VALUE_TEXT = '—';

export function knotsToMetersPerSecond(knots: number): number {
  return knots * METERS_PER_SECOND_PER_KNOT;
}

export function metersPerSecondToKnots(metersPerSecond: number): number {
  return metersPerSecond / METERS_PER_SECOND_PER_KNOT;
}

interface ParameterDisplayRule {
  decimals: number;
  suffix: string;
}

const PARAMETER_DISPLAY_RULES: Record<string, ParameterDisplayRule> = {
  temperature: { decimals: 0, suffix: '°C' },
  windSpeed: { decimals: 0, suffix: ' kt' },
  windDirection: { decimals: 0, suffix: '°' },
  waveHeight: { decimals: 1, suffix: ' m' },
};

export function formatParameterValue(parameter: string, value: number): string {
  if (Number.isNaN(value)) return MISSING_VALUE_TEXT;
  const rule = PARAMETER_DISPLAY_RULES[parameter];
  if (!rule) return String(value);
  return value.toFixed(rule.decimals) + rule.suffix;
}

export function formatWind(speedKnots: number, directionDegrees: number): string {
  if (Number.isNaN(speedKnots) || Number.isNaN(directionDegrees)) return MISSING_VALUE_TEXT;
  return `${speedKnots.toFixed(0)} kt / ${directionDegrees.toFixed(0)}°`;
}
```

- [ ] **Step 4: Migrate the one existing consumer and delete the old file**

Delete `src/app/utils/units.ts`. In `src/app/dev/spike/spike-data.ts`, replace the import and
the conversion line:

```ts
import { knotsToMetersPerSecond } from '../../units/units';
import { mapGridValues } from '../../utils/grids';
```

```ts
  const speedMetersPerSecond =
    speed.units === 'kt' ? mapGridValues(speed, knotsToMetersPerSecond, 'm/s') : speed;
```

- [ ] **Step 5: Verify**

Run: `npm test` → PASS. `npm run typecheck` → clean. `npm start` → spike still renders wind.

- [ ] **Step 6: Commit**

```bash
git add src/app/units src/app/utils src/app/dev/spike/spike-data.ts
git commit -m "feat: minimal units module (conversions + central display rules); retire utils/units"
```

---

## Task 4: Layer registry + finalized definition shapes

**Files:**
- Modify: `src/app/layers/layer-definition.ts`, `src/app/layers/model/temperature.ts`, `src/app/layers/model/wind.ts`, `src/app/engine/map-engine.ts`, `src/app/engine/renderers/colormap-renderer.ts`, `src/app/engine/renderers/particle-renderer.ts`, `src/app/dev/spike/spike-data.ts`
- Create: `src/app/layers/model/wave-height.ts`, `src/app/layers/registry.ts`

- [ ] **Step 1: Finalize the declarative shapes**

Replace `src/app/layers/layer-definition.ts` with:

```ts
import { FieldGrid, VectorField } from '../types/field-grid';

export interface ColorStop {
  value: number;
  color: string;
}

export interface TimeWindow {
  backHours: number;
  forwardHours: number;
  stepHours: number;
}

export interface ValueRange {
  min: number;
  max: number;
}

interface LayerCatalogEntryBase {
  id: string;
  label: string;
  defaultActive: boolean;
  defaultOpacity: number;
  timeWindow: TimeWindow;
  visibleRange?: ValueRange;
}

export interface ColormapLayerCatalogEntry extends LayerCatalogEntryBase {
  type: 'colormap';
  parameter: string;
  palette: ColorStop[];
  paletteStyle: 'smooth' | 'stepped';
}

export interface ParticleLayerCatalogEntry extends LayerCatalogEntryBase {
  type: 'particles';
  speedParameter: string;
  directionParameter: string;
}

export type LayerCatalogEntry = ColormapLayerCatalogEntry | ParticleLayerCatalogEntry;

export function layerParameters(entry: LayerCatalogEntry): string[] {
  if (entry.type === 'colormap') return [entry.parameter];
  return [entry.speedParameter, entry.directionParameter];
}

export interface ColormapLayerDefinition {
  entry: ColormapLayerCatalogEntry;
  grid: FieldGrid;
  opacity: number;
  order: number;
}

export interface ParticleLayerDefinition {
  entry: ParticleLayerCatalogEntry;
  wind: VectorField;
  opacity: number;
  order: number;
}

export type LayerDefinition = ColormapLayerDefinition | ParticleLayerDefinition;
```

- [ ] **Step 2: Update the catalog files + add the wave layer + the registry**

`src/app/layers/model/temperature.ts`:

```ts
import { ColormapLayerCatalogEntry } from '../layer-definition';

export const temperatureLayer: ColormapLayerCatalogEntry = {
  id: 'temperature',
  label: 'טמפרטורה',
  type: 'colormap',
  parameter: 'temperature',
  palette: [
    { value: -30, color: '#312e81' },
    { value: -15, color: '#1d4ed8' },
    { value: 0, color: '#0ea5e9' },
    { value: 10, color: '#34d399' },
    { value: 20, color: '#fbbf24' },
    { value: 30, color: '#f97316' },
    { value: 40, color: '#dc2626' },
  ],
  paletteStyle: 'smooth',
  defaultActive: true,
  defaultOpacity: 0.45,
  timeWindow: { backHours: 24, forwardHours: 96, stepHours: 3 },
};
```

`src/app/layers/model/wind.ts`:

```ts
import { ParticleLayerCatalogEntry } from '../layer-definition';

export const windLayer: ParticleLayerCatalogEntry = {
  id: 'wind',
  label: 'רוח',
  type: 'particles',
  speedParameter: 'windSpeed',
  directionParameter: 'windDirection',
  defaultActive: true,
  defaultOpacity: 0.9,
  timeWindow: { backHours: 24, forwardHours: 96, stepHours: 3 },
};
```

`src/app/layers/model/wave-height.ts` (stepped palette + `visibleRange` — this layer is the
missing-data and what-to-show demonstrator):

```ts
import { ColormapLayerCatalogEntry } from '../layer-definition';

export const waveHeightLayer: ColormapLayerCatalogEntry = {
  id: 'waveHeight',
  label: 'גובה גלים',
  type: 'colormap',
  parameter: 'waveHeight',
  palette: [
    { value: 0, color: '#155e75' },
    { value: 1, color: '#0891b2' },
    { value: 2, color: '#22d3ee' },
    { value: 3, color: '#fde047' },
    { value: 4, color: '#f97316' },
    { value: 5, color: '#dc2626' },
  ],
  paletteStyle: 'stepped',
  defaultActive: false,
  defaultOpacity: 0.6,
  visibleRange: { min: 0.2, max: 99 },
  timeWindow: { backHours: 24, forwardHours: 96, stepHours: 3 },
};
```

`src/app/layers/registry.ts`:

```ts
import { LayerCatalogEntry } from './layer-definition';
import { temperatureLayer } from './model/temperature';
import { waveHeightLayer } from './model/wave-height';
import { windLayer } from './model/wind';

export const layerRegistry: LayerCatalogEntry[] = [temperatureLayer, waveHeightLayer, windLayer];

export function registryEntry(id: string): LayerCatalogEntry | undefined {
  return layerRegistry.find((entry) => entry.id === id);
}
```

- [ ] **Step 3: Adapt the engine + spike to the nested definition shape (minimal edits, still WeatherLayers)**

In `src/app/engine/map-engine.ts`, key definitions by `definition.entry.id`, sort by order, and
narrow the union with an `in` check (the discriminant sits on the nested `entry`, so `'grid' in
definition` is the clean narrowing):

```ts
  addLayer(definition: LayerDefinition): void {
    this.definitions.set(definition.entry.id, definition);
    this.syncLayers();
  }
```

```ts
    this.overlay.setProps({
      layers: [...this.definitions.values()]
        .sort((a, b) => a.order - b.order)
        .map((definition) => this.toDeckLayer(definition)),
    });
```

```ts
  private toDeckLayer(definition: LayerDefinition): Layer {
    if ('grid' in definition) {
      return renderColormapLayer(definition, this.quality.textureMaxDimension());
    }
    return renderParticleLayer(definition, this.quality.particleCount());
  }
```

In `colormap-renderer.ts` change the property reads: `definition.entry.id`,
`definition.entry.palette`, `definition.opacity` (rest unchanged). In `particle-renderer.ts`:
`definition.entry.id`, `definition.opacity`.

In `src/app/dev/spike/spike-data.ts` change the two `addLayer` calls:

```ts
  engine.addLayer({ entry: temperatureLayer, grid: temperature, opacity: temperatureLayer.defaultOpacity, order: 0 });
  engine.addLayer({
    entry: windLayer,
    wind: toVectorField(speedMetersPerSecond, direction),
    opacity: windLayer.defaultOpacity,
    order: 1,
  });
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck` → clean. `npm test` → PASS. `npm start` → spike renders both layers as
before.

- [ ] **Step 5: Commit**

```bash
git add src/app/layers src/app/engine src/app/dev/spike/spike-data.ts
git commit -m "feat: finalized layer catalog/definition shapes + registry + wave-height layer"
```

---

## Task 5: Dev fixture backend (interceptor) + environment swap

**Files:**
- Create: `src/app/dev/fixture-backend/grid-window.ts`, `src/app/dev/fixture-backend/fixture-backend.ts`, `src/environments/environment.ts`, `src/environments/environment.development.ts`
- Modify: `src/app/app.config.ts`, `angular.json`
- Test (temporary): `src/app/dev/fixture-backend/grid-window.spec.ts`

- [ ] **Step 1: Write the failing temp test for the windowing math**

`src/app/dev/fixture-backend/grid-window.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FieldGridDocument } from '../../types/field-grid';
import { fixtureFileName, nearestFrameHours, sliceGridDocument } from './grid-window';

const doc: FieldGridDocument = {
  parameter: 'temperature',
  level: 'surface',
  units: 'C',
  runTime: '2026-06-11T00:00Z',
  forecastHours: 0,
  startLat: 60,
  startLon: 0,
  deltaLat: -1,
  deltaLon: 1,
  rows: 41,
  cols: 61,
  values: Array.from({ length: 41 }, (_, r) => Array.from({ length: 61 }, (_, c) => r * 100 + c)),
};

describe('sliceGridDocument', () => {
  it('returns the sub-grid covering the bbox, edges included', () => {
    const sliced = sliceGridDocument(doc, [10.5, 49.5, 20.5, 55.5]);
    expect(sliced).not.toBeNull();
    expect(sliced!.startLat).toBe(56);
    expect(sliced!.startLon).toBe(10);
    expect(sliced!.rows).toBe(8);
    expect(sliced!.cols).toBe(12);
    expect(sliced!.values[0][0]).toBe(4 * 100 + 10);
  });
  it('clamps to the grid extents', () => {
    const sliced = sliceGridDocument(doc, [-20, 50, 5, 90]);
    expect(sliced!.startLat).toBe(60);
    expect(sliced!.startLon).toBe(0);
  });
  it('returns null when there is no intersection', () => {
    expect(sliceGridDocument(doc, [100, 10, 110, 15])).toBeNull();
  });
});

describe('nearestFrameHours', () => {
  const manifest = { runTimeUnixSeconds: 1_000_000 * 3600, stepHours: 3, backHours: 24, forwardHours: 96 };
  it('rounds to the nearest step', () => {
    expect(nearestFrameHours(manifest.runTimeUnixSeconds + 4 * 3600, manifest)).toBe(3);
  });
  it('clamps to the available window', () => {
    expect(nearestFrameHours(manifest.runTimeUnixSeconds + 999 * 3600, manifest)).toBe(96);
    expect(nearestFrameHours(manifest.runTimeUnixSeconds - 999 * 3600, manifest)).toBe(-24);
  });
});

describe('fixtureFileName', () => {
  it('formats signed zero-padded hours', () => {
    expect(fixtureFileName('temperature', -24)).toBe('temperature_-024.json');
    expect(fixtureFileName('windSpeed', 9)).toBe('windSpeed_+009.json');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test` → FAIL (`grid-window.ts` missing).

- [ ] **Step 3: Implement the windowing module**

`src/app/dev/fixture-backend/grid-window.ts`:

```ts
import { Bounds, FieldGridDocument } from '../../types/field-grid';

export interface FixtureManifest {
  runTimeUnixSeconds: number;
  stepHours: number;
  backHours: number;
  forwardHours: number;
}

export function sliceGridDocument(
  doc: FieldGridDocument,
  bounds: Bounds,
): FieldGridDocument | null {
  const [west, south, east, north] = bounds;
  const lastRow = doc.rows - 1;
  const lastCol = doc.cols - 1;
  const rowStart = Math.max(0, Math.floor((doc.startLat - north) / -doc.deltaLat));
  const rowEnd = Math.min(lastRow, Math.ceil((doc.startLat - south) / -doc.deltaLat));
  const colStart = Math.max(0, Math.floor((west - doc.startLon) / doc.deltaLon));
  const colEnd = Math.min(lastCol, Math.ceil((east - doc.startLon) / doc.deltaLon));
  if (rowStart > rowEnd || colStart > colEnd) return null;
  const values = doc.values
    .slice(rowStart, rowEnd + 1)
    .map((row) => row.slice(colStart, colEnd + 1));
  return {
    ...doc,
    startLat: doc.startLat + doc.deltaLat * rowStart,
    startLon: doc.startLon + doc.deltaLon * colStart,
    rows: rowEnd - rowStart + 1,
    cols: colEnd - colStart + 1,
    values,
  };
}

export function nearestFrameHours(timeUnixSeconds: number, manifest: FixtureManifest): number {
  const offsetHours = (timeUnixSeconds - manifest.runTimeUnixSeconds) / 3600;
  const snapped = Math.round(offsetHours / manifest.stepHours) * manifest.stepHours;
  return Math.min(manifest.forwardHours, Math.max(-manifest.backHours, snapped));
}

export function fixtureFileName(parameter: string, hours: number): string {
  const sign = hours < 0 ? '-' : '+';
  return `${parameter}_${sign}${String(Math.abs(hours)).padStart(3, '0')}.json`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` → PASS.

- [ ] **Step 5: Implement the interceptor**

`src/app/dev/fixture-backend/fixture-backend.ts`:

```ts
import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { from } from 'rxjs';
import { Bounds, FieldGridDocument } from '../../types/field-grid';
import {
  FixtureManifest,
  fixtureFileName,
  nearestFrameHours,
  sliceGridDocument,
} from './grid-window';

const ARTIFICIAL_LATENCY_MS = 150;

let manifestPromise: Promise<FixtureManifest> | null = null;
const documentCache = new Map<string, Promise<FieldGridDocument>>();

export const fixtureBackendInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/')) return next(request);
  return from(answerFromFixtures(request));
};

async function answerFromFixtures(request: HttpRequest<unknown>): Promise<HttpEvent<unknown>> {
  await new Promise((resolve) => setTimeout(resolve, ARTIFICIAL_LATENCY_MS));
  if (request.url !== '/api/grids') {
    throw new HttpErrorResponse({ url: request.url, status: 404, statusText: 'Not Found' });
  }
  const parameter = request.params.get('parameter') ?? '';
  const model = request.params.get('model') ?? 'wide';
  const time = Number(request.params.get('time'));
  const bounds = (request.params.get('bbox') ?? '').split(',').map(Number) as Bounds;
  const manifest = await loadManifest();
  const hours = nearestFrameHours(time, manifest);
  const doc = await loadDocument(model, parameter, hours);
  const windowed = sliceGridDocument(doc, bounds);
  if (!windowed) {
    throw new HttpErrorResponse({ url: request.url, status: 404, statusText: 'Outside coverage' });
  }
  return new HttpResponse({ status: 200, body: windowed });
}

function loadManifest(): Promise<FixtureManifest> {
  manifestPromise ??= fetch('/fixtures/models/manifest.json').then(
    (response) => response.json() as Promise<FixtureManifest>,
  );
  return manifestPromise;
}

function loadDocument(model: string, parameter: string, hours: number): Promise<FieldGridDocument> {
  const url = `/fixtures/models/${model}/${fixtureFileName(parameter, hours)}`;
  let cached = documentCache.get(url);
  if (!cached) {
    cached = fetch(url).then((response) => {
      if (!response.ok) {
        throw new HttpErrorResponse({ url, status: 404, statusText: 'Unknown fixture' });
      }
      return response.json() as Promise<FieldGridDocument>;
    });
    documentCache.set(url, cached);
  }
  return cached;
}
```

- [ ] **Step 6: Environment files + wiring (the recorded quarantine exception)**

`src/environments/environment.ts`:

```ts
import { HttpInterceptorFn } from '@angular/common/http';

export const environment: { apiInterceptors: HttpInterceptorFn[] } = {
  apiInterceptors: [],
};
```

`src/environments/environment.development.ts`:

```ts
import { HttpInterceptorFn } from '@angular/common/http';
import { fixtureBackendInterceptor } from '../app/dev/fixture-backend/fixture-backend';

export const environment: { apiInterceptors: HttpInterceptorFn[] } = {
  apiInterceptors: [fixtureBackendInterceptor],
};
```

`src/app/app.config.ts`:

```ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { environment } from '../environments/environment';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors(environment.apiInterceptors)),
  ],
};
```

In `angular.json`, add to the `development` configuration of the `build` target (next to
`"optimization": false`):

```json
"fileReplacements": [
  {
    "replace": "src/environments/environment.ts",
    "with": "src/environments/environment.development.ts"
  }
]
```

- [ ] **Step 7: Verify both build flavors**

The interceptor only sees **HttpClient** traffic, so it can't be exercised from the console with
raw `fetch` — end-to-end interception is verified in Task 7 once `FieldData` exists. For now
verify both build flavors:
`npm start` → app boots clean; `npm run build` → prod build succeeds, and
`Select-String -Path dist/meteo/browser/*.js -Pattern "fixtureBackend" -List` → no matches
(zero mock code in prod).

- [ ] **Step 8: Commit**

```bash
git add src/app/dev/fixture-backend src/environments src/app/app.config.ts angular.json
git commit -m "feat: dev fixture backend interceptor + environment swap (prod ships no mock code)"
```

---

## Task 6: Stores — LayersStore + TimeStore

**Files:**
- Create: `src/app/stores/layers-store.ts`, `src/app/stores/time-store.ts`

- [ ] **Step 1: LayersStore**

`src/app/stores/layers-store.ts`:

```ts
import { Service, signal } from '@angular/core';
import { layerRegistry } from '../layers/registry';

export interface LayerUiState {
  id: string;
  active: boolean;
  opacity: number;
  order: number;
}

@Service()
export class LayersStore {
  readonly states = signal<LayerUiState[]>(
    layerRegistry.map((entry, index) => ({
      id: entry.id,
      active: entry.defaultActive,
      opacity: entry.defaultOpacity,
      order: index,
    })),
  );
  readonly hoverReadoutEnabled = signal(true);

  stateOf(id: string): LayerUiState | undefined {
    return this.states().find((state) => state.id === id);
  }

  toggle(id: string): void {
    this.states.update((states) =>
      states.map((state) => (state.id === id ? { ...state, active: !state.active } : state)),
    );
  }

  setOpacity(id: string, opacity: number): void {
    this.states.update((states) =>
      states.map((state) => (state.id === id ? { ...state, opacity } : state)),
    );
  }

  move(id: string, direction: -1 | 1): void {
    this.states.update((states) => {
      const ordered = [...states].sort((a, b) => a.order - b.order);
      const index = ordered.findIndex((state) => state.id === id);
      const neighborIndex = index + direction;
      if (index < 0 || neighborIndex < 0 || neighborIndex >= ordered.length) return states;
      const reordered = [...ordered];
      [reordered[index], reordered[neighborIndex]] = [reordered[neighborIndex], reordered[index]];
      return states.map((state) => ({
        ...state,
        order: reordered.findIndex((entry) => entry.id === state.id),
      }));
    });
  }

  toggleHoverReadout(): void {
    this.hoverReadoutEnabled.update((enabled) => !enabled);
  }
}
```

- [ ] **Step 2: TimeStore**

`src/app/stores/time-store.ts`:

```ts
import { Service, computed, inject, signal } from '@angular/core';
import { registryEntry } from '../layers/registry';
import { clampToRange, snapToStep } from '../utils/time';
import { LayersStore } from './layers-store';

const DEFAULT_STEP_HOURS = 3;
const DEFAULT_BACK_HOURS = 24;
const DEFAULT_FORWARD_HOURS = 96;

@Service()
export class TimeStore {
  private layers = inject(LayersStore);
  private referenceNow = Math.floor(Date.now() / 1000);

  readonly stepHours = computed(() => {
    const steps = this.activeWindows().map((window) => window.stepHours);
    return steps.length ? Math.min(...steps) : DEFAULT_STEP_HOURS;
  });

  readonly window = computed(() => {
    const windows = this.activeWindows();
    const backHours = windows.length
      ? Math.max(...windows.map((w) => w.backHours))
      : DEFAULT_BACK_HOURS;
    const forwardHours = windows.length
      ? Math.max(...windows.map((w) => w.forwardHours))
      : DEFAULT_FORWARD_HOURS;
    return {
      start: this.referenceNow - backHours * 3600,
      end: this.referenceNow + forwardHours * 3600,
    };
  });

  readonly currentTime = signal(snapToStep(Math.floor(Date.now() / 1000), DEFAULT_STEP_HOURS));

  jumpTo(unixSeconds: number): void {
    const { start, end } = this.window();
    this.currentTime.set(snapToStep(clampToRange(unixSeconds, start, end), this.stepHours()));
  }

  stepForward(): void {
    this.jumpTo(this.currentTime() + this.stepHours() * 3600);
  }

  stepBack(): void {
    this.jumpTo(this.currentTime() - this.stepHours() * 3600);
  }

  jumpToNow(): void {
    this.jumpTo(Math.floor(Date.now() / 1000));
  }

  private activeWindows() {
    return this.layers
      .states()
      .filter((state) => state.active)
      .map((state) => registryEntry(state.id)?.timeWindow)
      .filter((window) => window !== undefined);
  }
}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck` → clean. `npm test` → still PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/stores
git commit -m "feat: layers + time signal-stores"
```

---

## Task 7: Engine camera/cursor signals + FieldData service; retire the spike loader

**Files:**
- Modify: `src/app/engine/map-engine.ts`, `src/app/pages/home/home-page.ts`, `src/app/pages/home/home-page.html`
- Create: `src/app/data/field-data.ts`
- Delete: `src/app/dev/spike/` (entire folder)

- [ ] **Step 1: Engine exposes view/cursor signals + flyToBounds**

In `src/app/engine/map-engine.ts` add imports `signal` (from `@angular/core`) and `Bounds`
(from `../types/field-grid`), then add fields and wiring:

```ts
  readonly viewBounds = signal<Bounds | null>(null);
  readonly zoom = signal<number | null>(null);
  readonly cursor = signal<{ point: [number, number]; lngLat: [number, number] } | null>(null);
```

In `init`, after constructing the map:

```ts
    this.map.on('move', () => this.publishView());
    this.map.on('mousemove', (event) => {
      this.cursor.set({
        point: [event.point.x, event.point.y],
        lngLat: [event.lngLat.lng, event.lngLat.lat],
      });
    });
    this.map.getCanvasContainer().addEventListener('mouseleave', () => this.cursor.set(null));
    this.map.on('load', () => this.publishView());
```

Add the methods:

```ts
  flyToBounds(bounds: Bounds): void {
    this.map?.fitBounds(
      [
        [bounds[0], bounds[1]],
        [bounds[2], bounds[3]],
      ],
      { padding: 40 },
    );
  }

  private publishView(): void {
    if (!this.map) return;
    const bounds = this.map.getBounds();
    this.viewBounds.set([
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ]);
    this.zoom.set(this.map.getZoom());
  }
```

In `destroy()`, also reset: `this.viewBounds.set(null); this.zoom.set(null); this.cursor.set(null);`

- [ ] **Step 2: The data-access layer**

`src/app/data/field-data.ts`:

```ts
import { Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { HttpResourceRef, httpResource } from '@angular/common/http';
import { MapEngine } from '../engine/map-engine';
import {
  LayerCatalogEntry,
  LayerDefinition,
  layerParameters,
} from '../layers/layer-definition';
import { layerRegistry } from '../layers/registry';
import { LayersStore } from '../stores/layers-store';
import { TimeStore } from '../stores/time-store';
import { Bounds, FieldGrid, FieldGridDocument, VectorField } from '../types/field-grid';
import { knotsToMetersPerSecond } from '../units/units';
import { containsBounds, expandBounds } from '../utils/bbox';
import { mapGridValues, parseFieldGrid, toVectorField } from '../utils/grids';

const MODEL_ZOOM_THRESHOLD = 5;
const BBOX_PADDING_FACTOR = 0.25;

export interface LoadedLayer {
  entry: LayerCatalogEntry;
  opacity: number;
  order: number;
  grids: Record<string, FieldGrid>;
}

const parsedGrids = new WeakMap<FieldGridDocument, FieldGrid>();
const windFields = new WeakMap<FieldGrid, VectorField>();

@Service()
export class FieldData {
  private engine = inject(MapEngine);
  private layersStore = inject(LayersStore);
  private timeStore = inject(TimeStore);
  private requestBounds = signal<Bounds | null>(null);
  private resources = new Map<string, HttpResourceRef<FieldGridDocument | undefined>>();

  private model = computed(() => ((this.engine.zoom() ?? 0) >= MODEL_ZOOM_THRESHOLD ? 'local' : 'wide'));

  readonly loadedLayers = computed<LoadedLayer[]>(() => {
    const loaded: LoadedLayer[] = [];
    for (const entry of layerRegistry) {
      const state = this.layersStore.stateOf(entry.id);
      if (!state?.active) continue;
      const grids: Record<string, FieldGrid> = {};
      let complete = true;
      for (const parameter of layerParameters(entry)) {
        const document = this.resources.get(resourceKey(entry.id, parameter))?.value();
        if (!document) {
          complete = false;
          break;
        }
        grids[parameter] = parseDocument(document);
      }
      if (complete) {
        loaded.push({ entry, opacity: state.opacity, order: state.order, grids });
      }
    }
    return loaded;
  });

  constructor() {
    effect(() => {
      const visible = this.engine.viewBounds();
      if (!visible) return;
      const current = untracked(this.requestBounds);
      if (!current || !containsBounds(current, visible)) {
        this.requestBounds.set(expandBounds(visible, BBOX_PADDING_FACTOR));
      }
    });
    for (const entry of layerRegistry) {
      for (const parameter of layerParameters(entry)) {
        this.resources.set(
          resourceKey(entry.id, parameter),
          httpResource<FieldGridDocument>(() => {
            if (!this.layersStore.stateOf(entry.id)?.active) return undefined;
            const bounds = this.requestBounds();
            if (!bounds) return undefined;
            return {
              url: '/api/grids',
              params: {
                parameter,
                model: this.model(),
                time: String(this.timeStore.currentTime()),
                bbox: bounds.join(','),
              },
            };
          }),
        );
      }
    }
    effect(() => this.syncEngine());
  }

  private syncEngine(): void {
    const loaded = this.loadedLayers();
    for (const entry of layerRegistry) {
      const layer = loaded.find((candidate) => candidate.entry.id === entry.id);
      if (layer) {
        this.engine.addLayer(toDefinition(layer));
      } else {
        this.engine.removeLayer(entry.id);
      }
    }
  }
}

function resourceKey(layerId: string, parameter: string): string {
  return `${layerId}:${parameter}`;
}

function parseDocument(document: FieldGridDocument): FieldGrid {
  let grid = parsedGrids.get(document);
  if (!grid) {
    grid = parseFieldGrid(document);
    parsedGrids.set(document, grid);
  }
  return grid;
}

function toDefinition(layer: LoadedLayer): LayerDefinition {
  if (layer.entry.type === 'colormap') {
    return {
      entry: layer.entry,
      grid: layer.grids[layer.entry.parameter],
      opacity: layer.opacity,
      order: layer.order,
    };
  }
  const speed = layer.grids[layer.entry.speedParameter];
  const direction = layer.grids[layer.entry.directionParameter];
  let wind = windFields.get(speed);
  if (!wind) {
    const speedMetersPerSecond =
      speed.units === 'kt' ? mapGridValues(speed, knotsToMetersPerSecond, 'm/s') : speed;
    wind = toVectorField(speedMetersPerSecond, direction);
    windFields.set(speed, wind);
  }
  return { entry: layer.entry, wind, opacity: layer.opacity, order: layer.order };
}
```

- [ ] **Step 3: Switch the home page off the spike**

`src/app/pages/home/home-page.ts` — remove the `SpikeControls` import and add `FieldData`:

```ts
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FieldData } from '../../data/field-data';
import { PerfHud } from '../../dev/perf-hud/perf-hud';
import { BasemapId, MapEngine } from '../../engine/map-engine';

@Component({
  selector: 'app-home-page',
  imports: [PerfHud],
  host: { class: 'block h-full' },
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage implements AfterViewInit, OnDestroy {
  private engine = inject(MapEngine);
  private fieldData = inject(FieldData);
  private container = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  basemaps: { id: BasemapId; label: string }[] = [
    { id: 'dark', label: 'כהה' },
    { id: 'light', label: 'בהיר' },
    { id: 'colorful', label: 'צבעוני' },
  ];
  basemap = signal<BasemapId>('dark');
  engineReady = signal(false);

  ngAfterViewInit(): void {
    void this.start();
  }

  setBasemap(id: BasemapId): void {
    this.basemap.set(id);
    void this.engine.setBasemap(id);
  }

  ngOnDestroy(): void {
    this.engine.destroy();
  }

  private async start(): Promise<void> {
    await this.engine.init(this.container().nativeElement, this.basemap());
    this.engineReady.set(true);
  }
}
```

In `home-page.html`, delete the `@if (engineReady()) { … <app-spike-controls /> … }` block.
Delete the folder `src/app/dev/spike/` entirely.

(`fieldData` is injected but unused by the class — that is its activation. If ESLint flags the
unused field, change the line to `protected fieldData = inject(FieldData);` and keep it.)

- [ ] **Step 4: Verify the full new pipeline**

Run: `npm run typecheck` → clean. `npm start` →
- temperature + wind render from the new path. Note: intercepted `/api/grids` calls never reach
  the wire — the network tab instead shows the interceptor's own `/fixtures/models/...` fetches.
- Pan far enough to leave the padded bbox → new fixture fetches fire; small pans → none.
- Zoom in past z5 → fetches switch to the `local` model folder and the data visibly sharpens.
- Pan to e.g. the Americas (outside fixture coverage) → layers disappear cleanly, no console
  errors (404 → resource error → engine layer removed).

- [ ] **Step 5: Commit**

```bash
git add -A src/app
git commit -m "feat: bbox-windowed data access over the real contract; engine view/cursor signals; spike loader retired"
```

---

## Task 8: First-party colormap renderer (mercator-correct, missing-data-aware)

**Files:**
- Rewrite: `src/app/engine/renderers/colormap-renderer.ts`
- Modify: `src/app/utils/grids.ts` (delete `downsampleGrid`), `package.json` (add `@deck.gl/layers`)
- Test (temporary): `src/app/engine/renderers/colormap-renderer.spec.ts`

- [ ] **Step 1: Make `@deck.gl/layers` a direct dependency**

Run: `npm install @deck.gl/layers@^9.3.3`
(Already present in `node_modules` as a peer of weatherlayers-gl — this records it as our own,
which Task 9's uninstall depends on. The vendored-deps doc is updated in Task 11.)

- [ ] **Step 2: Write the failing temp test (palette + mercator row mapping)**

`src/app/engine/renderers/colormap-renderer.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mercatorLatitudes, paletteRgba } from './colormap-renderer';
import { ColorStop } from '../../layers/layer-definition';

const palette: ColorStop[] = [
  { value: 0, color: '#000000' },
  { value: 10, color: '#ff0000' },
];

describe('paletteRgba', () => {
  it('interpolates smoothly between stops', () => {
    expect(paletteRgba(5, palette, 'smooth')).toEqual([128, 0, 0, 255]);
  });
  it('holds the band color when stepped', () => {
    expect(paletteRgba(5, palette, 'stepped')).toEqual([0, 0, 0, 255]);
    expect(paletteRgba(10, palette, 'stepped')).toEqual([255, 0, 0, 255]);
  });
  it('clamps outside the stops', () => {
    expect(paletteRgba(-5, palette, 'smooth')).toEqual([0, 0, 0, 255]);
    expect(paletteRgba(15, palette, 'smooth')).toEqual([255, 0, 0, 255]);
  });
});

describe('mercatorLatitudes', () => {
  it('spaces rows linearly in mercator Y, not latitude', () => {
    const latitudes = mercatorLatitudes(60, 0, 5);
    expect(latitudes[0]).toBeCloseTo(60, 6);
    expect(latitudes[4]).toBeCloseTo(0, 6);
    expect(latitudes[2]).toBeGreaterThan(30);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test` → FAIL (exports missing).

- [ ] **Step 4: Implement the renderer**

Replace `src/app/engine/renderers/colormap-renderer.ts` with:

```ts
import type { Layer } from '@deck.gl/core';
import { BitmapLayer } from '@deck.gl/layers';
import { ColorStop, ColormapLayerDefinition } from '../../layers/layer-definition';
import { FieldGrid } from '../../types/field-grid';
import { sampleGrid } from '../../utils/grids';

const colorizedImages = new WeakMap<FieldGrid, { textureCap: number; image: ImageData }>();

export function renderColormapLayer(
  definition: ColormapLayerDefinition,
  textureCap: number,
): Layer {
  return new BitmapLayer({
    id: definition.entry.id,
    image: colorizeGrid(definition, textureCap),
    bounds: definition.grid.bounds,
    opacity: definition.opacity,
  });
}

function colorizeGrid(definition: ColormapLayerDefinition, textureCap: number): ImageData {
  const grid = definition.grid;
  const cached = colorizedImages.get(grid);
  if (cached && cached.textureCap === textureCap) return cached.image;
  const width = Math.max(2, Math.min(grid.width, textureCap));
  const height = Math.max(2, Math.min(grid.height * 2, textureCap));
  const [west, , east, north] = grid.bounds;
  const south = grid.bounds[1];
  const latitudes = mercatorLatitudes(north, south, height);
  const rgba = new Uint8ClampedArray(width * height * 4);
  const visibleRange = definition.entry.visibleRange;
  for (let row = 0; row < height; row++) {
    const lat = latitudes[row];
    for (let col = 0; col < width; col++) {
      const lon = west + ((east - west) * col) / (width - 1);
      const value = sampleGrid(grid, lon, lat);
      const offset = (row * width + col) * 4;
      if (
        Number.isNaN(value) ||
        (visibleRange && (value < visibleRange.min || value > visibleRange.max))
      ) {
        continue;
      }
      const [r, g, b, a] = paletteRgba(value, definition.entry.palette, definition.entry.paletteStyle);
      rgba[offset] = r;
      rgba[offset + 1] = g;
      rgba[offset + 2] = b;
      rgba[offset + 3] = a;
    }
  }
  const image = new ImageData(rgba, width, height);
  colorizedImages.set(grid, { textureCap, image });
  return image;
}

export function mercatorLatitudes(north: number, south: number, rows: number): number[] {
  const yNorth = mercatorY(north);
  const ySouth = mercatorY(south);
  const latitudes: number[] = [];
  for (let row = 0; row < rows; row++) {
    const y = yNorth + ((ySouth - yNorth) * row) / (rows - 1);
    latitudes.push(inverseMercatorY(y));
  }
  return latitudes;
}

function mercatorY(latitudeDegrees: number): number {
  const radians = (latitudeDegrees * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + radians / 2));
}

function inverseMercatorY(y: number): number {
  return ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI;
}

export function paletteRgba(
  value: number,
  palette: ColorStop[],
  style: 'smooth' | 'stepped',
): [number, number, number, number] {
  if (value <= palette[0].value) return hexRgba(palette[0].color);
  const last = palette[palette.length - 1];
  if (value >= last.value) return hexRgba(last.color);
  let upper = 1;
  while (palette[upper].value < value) upper++;
  const below = palette[upper - 1];
  const above = palette[upper];
  if (style === 'stepped') return hexRgba(value >= above.value ? above.color : below.color);
  const fraction = (value - below.value) / (above.value - below.value);
  const [r0, g0, b0] = hexRgba(below.color);
  const [r1, g1, b1] = hexRgba(above.color);
  return [
    Math.round(r0 + (r1 - r0) * fraction),
    Math.round(g0 + (g1 - g0) * fraction),
    Math.round(b0 + (b1 - b0) * fraction),
    255,
  ];
}

function hexRgba(hex: string): [number, number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
    255,
  ];
}
```

Delete `downsampleGrid` from `src/app/utils/grids.ts` (the colorizer caps dimensions itself).

- [ ] **Step 5: Run tests + visual verification**

Run: `npm test` → PASS. `npm start` →
- Temperature renders as before (smooth gradient), survives basemap switches and pans.
- Toggle nothing yet (no UI): temporarily verify the wave layer by setting
  `defaultActive: true` in `wave-height.ts`, reload — stepped bands over sea, fully transparent
  holes over the fake land, hidden below 0.2 m. **Revert `defaultActive` to `false` after
  looking.**
- High-latitude alignment check: zoom to the top edge of the wide grid (60°N); the colormap's
  edge must sit exactly at the basemap's 60th parallel, not drift south.

- [ ] **Step 6: Commit**

```bash
git add src/app/engine/renderers/colormap-renderer.ts src/app/engine/renderers/colormap-renderer.spec.ts src/app/utils/grids.ts package.json package-lock.json
git commit -m "feat: first-party colormap renderer (BitmapLayer, mercator-spaced rows, visibleRange, NaN transparency)"
```

---

## Task 9: First-party CPU particle renderer; weatherlayers-gl leaves

**Files:**
- Rewrite: `src/app/engine/renderers/particle-renderer.ts`
- Modify: `src/app/engine/map-engine.ts`, `package.json`

- [ ] **Step 1: Implement the particle system + renderer**

Replace `src/app/engine/renderers/particle-renderer.ts` with:

```ts
import type { Layer } from '@deck.gl/core';
import { LineLayer } from '@deck.gl/layers';
import { ParticleLayerDefinition } from '../../layers/layer-definition';
import { Bounds, VectorField } from '../../types/field-grid';
import { sampleVectorField } from '../../utils/grids';

const TRAIL_POINTS = 8;
const MAX_AGE_SECONDS = 8;
const DEGREES_PER_METER_PER_SECOND = 0.0015;
const MIN_LATITUDE_COSINE = 0.2;

export class ParticleSystem {
  private history: Float32Array;
  private ages: Float32Array;
  private sources: Float32Array;
  private targets: Float32Array;
  private colors: Uint8Array;
  private spawnBounds: Bounds;

  constructor(
    readonly wind: VectorField,
    readonly count: number,
    initialBounds: Bounds,
  ) {
    this.history = new Float32Array(TRAIL_POINTS * count * 2);
    this.ages = new Float32Array(count);
    const segments = count * (TRAIL_POINTS - 1);
    this.sources = new Float32Array(segments * 2);
    this.targets = new Float32Array(segments * 2);
    this.colors = new Uint8Array(segments * 4);
    this.spawnBounds = initialBounds;
    for (let i = 0; i < count; i++) this.respawn(i, Math.random() * MAX_AGE_SECONDS);
    for (let i = 0; i < segments; i++) {
      const trailIndex = i % (TRAIL_POINTS - 1);
      const alpha = Math.round(255 * (1 - trailIndex / (TRAIL_POINTS - 1)));
      this.colors[i * 4] = 255;
      this.colors[i * 4 + 1] = 255;
      this.colors[i * 4 + 2] = 255;
      this.colors[i * 4 + 3] = alpha;
    }
  }

  setSpawnBounds(bounds: Bounds): void {
    this.spawnBounds = bounds;
  }

  step(deltaSeconds: number): void {
    const stride = this.count * 2;
    this.history.copyWithin(stride, 0, stride * (TRAIL_POINTS - 1));
    for (let i = 0; i < this.count; i++) {
      const lon = this.history[stride + i * 2];
      const lat = this.history[stride + i * 2 + 1];
      const [u, v] = sampleVectorField(this.wind, lon, lat);
      this.ages[i] += deltaSeconds;
      if (Number.isNaN(u) || this.ages[i] > MAX_AGE_SECONDS || this.outsideSpawnArea(lon, lat)) {
        this.respawn(i, 0);
        continue;
      }
      const latitudeCosine = Math.max(MIN_LATITUDE_COSINE, Math.cos((lat * Math.PI) / 180));
      const speedScale = DEGREES_PER_METER_PER_SECOND * deltaSeconds * 60;
      this.history[i * 2] = lon + (u * speedScale) / latitudeCosine;
      this.history[i * 2 + 1] = lat + v * speedScale;
    }
  }

  layerData(): {
    length: number;
    attributes: {
      getSourcePosition: { value: Float32Array; size: number };
      getTargetPosition: { value: Float32Array; size: number };
      getColor: { value: Uint8Array; size: number };
    };
  } {
    let segment = 0;
    const stride = this.count * 2;
    for (let i = 0; i < this.count; i++) {
      for (let t = 0; t < TRAIL_POINTS - 1; t++) {
        this.sources[segment * 2] = this.history[t * stride + i * 2];
        this.sources[segment * 2 + 1] = this.history[t * stride + i * 2 + 1];
        this.targets[segment * 2] = this.history[(t + 1) * stride + i * 2];
        this.targets[segment * 2 + 1] = this.history[(t + 1) * stride + i * 2 + 1];
        segment++;
      }
    }
    return {
      length: segment,
      attributes: {
        getSourcePosition: { value: this.sources, size: 2 },
        getTargetPosition: { value: this.targets, size: 2 },
        getColor: { value: this.colors, size: 4 },
      },
    };
  }

  private outsideSpawnArea(lon: number, lat: number): boolean {
    const [west, south, east, north] = this.spawnBounds;
    const lonMargin = (east - west) * 0.1;
    const latMargin = (north - south) * 0.1;
    return (
      lon < west - lonMargin ||
      lon > east + lonMargin ||
      lat < south - latMargin ||
      lat > north + latMargin
    );
  }

  private respawn(index: number, age: number): void {
    const [west, south, east, north] = this.spawnBounds;
    let lon = 0;
    let lat = 0;
    for (let attempt = 0; attempt < 8; attempt++) {
      lon = west + Math.random() * (east - west);
      lat = south + Math.random() * (north - south);
      const [u] = sampleVectorField(this.wind, lon, lat);
      if (!Number.isNaN(u)) break;
    }
    this.ages[index] = age;
    for (let t = 0; t < TRAIL_POINTS; t++) {
      this.history[t * this.count * 2 + index * 2] = lon;
      this.history[t * this.count * 2 + index * 2 + 1] = lat;
    }
  }
}

export function renderParticleLayer(
  definition: ParticleLayerDefinition,
  system: ParticleSystem,
): Layer {
  return new LineLayer({
    id: definition.entry.id,
    data: system.layerData(),
    getWidth: 1.5,
    widthUnits: 'pixels',
    opacity: definition.opacity,
  });
}
```

- [ ] **Step 2: Engine drives the systems with one animation loop**

In `src/app/engine/map-engine.ts`, update the renderer import to bring `ParticleSystem`:

```ts
import { ParticleSystem, renderParticleLayer } from './renderers/particle-renderer';
```

Add fields:

```ts
  private particleSystems = new Map<string, ParticleSystem>();
  private animationFrame: number | null = null;
  private lastTickMs = 0;
```

Replace `toDeckLayer` and add the loop methods:

```ts
  private toDeckLayer(definition: LayerDefinition): Layer {
    if ('grid' in definition) {
      return renderColormapLayer(definition, this.quality.textureMaxDimension());
    }
    return renderParticleLayer(definition, this.particleSystem(definition));
  }

  private particleSystem(definition: ParticleLayerDefinition): ParticleSystem {
    const id = definition.entry.id;
    const existing = this.particleSystems.get(id);
    const count = this.quality.particleCount();
    if (existing && existing.wind === definition.wind && existing.count === count) {
      return existing;
    }
    const system = new ParticleSystem(
      definition.wind,
      count,
      this.viewBounds() ?? definition.wind.bounds,
    );
    this.particleSystems.set(id, system);
    return system;
  }

  private animate = (nowMs: number): void => {
    const deltaSeconds = Math.min(0.1, (nowMs - this.lastTickMs) / 1000 || 0.016);
    this.lastTickMs = nowMs;
    const bounds = this.viewBounds();
    for (const [id, system] of this.particleSystems) {
      if (!this.definitions.has(id)) {
        this.particleSystems.delete(id);
        continue;
      }
      if (bounds) system.setSpawnBounds(bounds);
      system.step(deltaSeconds);
    }
    this.syncLayers();
    this.animationFrame = requestAnimationFrame(this.animate);
  };

  private updateAnimationLoop(): void {
    const hasParticles = [...this.definitions.values()].some((definition) => 'wind' in definition);
    if (hasParticles && this.animationFrame === null) {
      this.lastTickMs = performance.now();
      this.animationFrame = requestAnimationFrame(this.animate);
    }
    if (!hasParticles && this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
```

Call `this.updateAnimationLoop();` as the last line of both `addLayer` and `removeLayer`, and in
`destroy()` cancel the frame:

```ts
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
    this.particleSystems.clear();
```

Add the import needed by `particleSystem`'s parameter type:
`ParticleLayerDefinition` from `../layers/layer-definition`.

- [ ] **Step 3: Uninstall weatherlayers-gl**

Run: `npm uninstall weatherlayers-gl`
Run: `Select-String -Path src -Pattern "weatherlayers" -Recurse` (Grep) → zero matches.

- [ ] **Step 4: Verify + micro-benchmark**

Run: `npm run typecheck` → clean. `npm test` → PASS. `npm start` →
- Wind particles render as white streaks with fading trails, moving with the flow; pan/zoom
  re-seeds into the view; scrub of time (via devtools: not yet — time UI lands next task; verify
  motion + look only).
- Perf HUD (Ctrl+Alt+P): **60 fps** at default knobs (5,000 particles). Raise to 20,000 via the
  HUD knobs → still interactive (≥ 45 fps on the dev box, knob scales down as designed).
- NaN handling: pan so the view straddles the edge of fixture coverage — particles die and
  respawn inside coverage rather than freezing or streaking across the void.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: first-party CPU particle renderer (LineLayer trails); remove weatherlayers-gl"
```

---

## Task 10: UI chrome — time bar, layer bar, hover readout, frame-AOI

**Files:**
- Create (3 files each per convention): `src/app/pages/home/time-bar/time-bar.{ts,html,css}`, `src/app/pages/home/layer-bar/layer-bar.{ts,html,css}`, `src/app/pages/home/hover-readout/hover-readout.{ts,html,css}`, `src/app/pages/home/frame-aoi/frame-aoi.{ts,html,css}`, `src/app/pages/home/frame-aoi/aois.ts`
- Modify: `src/app/pages/home/home-page.ts`, `src/app/pages/home/home-page.html`

All `.css` files may be empty (like `home-page.css`) — Tailwind carries the styling; create them
anyway per the three-file rule.

- [ ] **Step 1: Time bar**

`src/app/pages/home/time-bar/time-bar.ts`:

```ts
import { Component, computed, inject } from '@angular/core';
import { TimeStore } from '../../../stores/time-store';
import { formatLocalTime } from '../../../utils/time';

@Component({
  selector: 'app-time-bar',
  templateUrl: './time-bar.html',
  styleUrl: './time-bar.css',
  host: {
    '(window:keydown.arrowright)': 'onArrow($event, 1)',
    '(window:keydown.arrowleft)': 'onArrow($event, -1)',
  },
})
export class TimeBar {
  store = inject(TimeStore);
  stepSeconds = computed(() => this.store.stepHours() * 3600);
  currentLabel = computed(() => formatLocalTime(this.store.currentTime()));
  backLabel = computed(() => formatWindowHours(this.store.window().start));
  forwardLabel = computed(() => formatWindowHours(this.store.window().end));

  onArrow(event: Event, direction: 1 | -1): void {
    event.preventDefault();
    if (direction === 1) this.store.stepForward();
    else this.store.stepBack();
  }

  onScrub(event: Event): void {
    this.store.jumpTo(Number((event.target as HTMLInputElement).value));
  }
}

function formatWindowHours(unixSeconds: number): string {
  const hours = Math.round((unixSeconds - Date.now() / 1000) / 3600);
  return hours > 0 ? `+${hours}` : String(hours);
}
```

`src/app/pages/home/time-bar/time-bar.html`:

```html
<div
  class="flex items-center gap-3 rounded-md border border-panel-border bg-panel/90 px-3 py-2 text-sm"
>
  <button class="rounded bg-accent px-2 py-1 text-app" (click)="store.jumpToNow()">עכשיו</button>
  <div class="flex flex-1 items-center gap-2" dir="ltr">
    <span class="text-xs">{{ backLabel() }}</span>
    <input
      type="range"
      class="flex-1"
      [min]="store.window().start"
      [max]="store.window().end"
      [step]="stepSeconds()"
      [value]="store.currentTime()"
      (input)="onScrub($event)"
    />
    <span class="text-xs">{{ forwardLabel() }}</span>
  </div>
  <span class="min-w-28 text-end font-medium">{{ currentLabel() }}</span>
</div>
```

(The track is `dir="ltr"` deliberately — time axes read left→right even in the RTL UI, matching
the spike's precedent for hour buttons.)

- [ ] **Step 2: Layer bar**

`src/app/pages/home/layer-bar/layer-bar.ts`:

```ts
import { Component, computed, inject } from '@angular/core';
import { layerRegistry } from '../../../layers/registry';
import { LayersStore } from '../../../stores/layers-store';

@Component({
  selector: 'app-layer-bar',
  templateUrl: './layer-bar.html',
  styleUrl: './layer-bar.css',
})
export class LayerBar {
  store = inject(LayersStore);
  rows = computed(() =>
    [...this.store.states()]
      .sort((a, b) => a.order - b.order)
      .map((state) => ({ state, entry: layerRegistry.find((entry) => entry.id === state.id)! })),
  );

  onOpacity(id: string, event: Event): void {
    this.store.setOpacity(id, Number((event.target as HTMLInputElement).value));
  }
}
```

`src/app/pages/home/layer-bar/layer-bar.html`:

```html
<div
  class="flex h-full w-56 flex-col gap-3 overflow-y-auto border-s border-panel-border bg-panel/90 p-3 text-sm"
>
  <h2 class="font-medium">שכבות</h2>
  @for (row of rows(); track row.state.id) {
    <div class="flex flex-col gap-1 rounded-md border border-panel-border p-2">
      <div class="flex items-center justify-between gap-2">
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            [checked]="row.state.active"
            (change)="store.toggle(row.state.id)"
          />
          {{ row.entry.label }}
        </label>
        <span class="flex gap-1">
          <button class="rounded border border-panel-border px-1" (click)="store.move(row.state.id, -1)">↑</button>
          <button class="rounded border border-panel-border px-1" (click)="store.move(row.state.id, 1)">↓</button>
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        [value]="row.state.opacity"
        (input)="onOpacity(row.state.id, $event)"
      />
    </div>
  }
  <label class="mt-auto flex items-center gap-2 border-t border-panel-border pt-2">
    <input
      type="checkbox"
      [checked]="store.hoverReadoutEnabled()"
      (change)="store.toggleHoverReadout()"
    />
    קריאת ערכים בריחוף
  </label>
</div>
```

- [ ] **Step 3: Hover readout**

`src/app/pages/home/hover-readout/hover-readout.ts`:

```ts
import { Component, computed, inject } from '@angular/core';
import { FieldData } from '../../../data/field-data';
import { MapEngine } from '../../../engine/map-engine';
import { LayersStore } from '../../../stores/layers-store';
import { formatParameterValue, formatWind } from '../../../units/units';
import { sampleGrid } from '../../../utils/grids';

@Component({
  selector: 'app-hover-readout',
  templateUrl: './hover-readout.html',
  styleUrl: './hover-readout.css',
})
export class HoverReadout {
  private engine = inject(MapEngine);
  private fieldData = inject(FieldData);
  private layersStore = inject(LayersStore);

  readout = computed(() => {
    if (!this.layersStore.hoverReadoutEnabled()) return null;
    const cursor = this.engine.cursor();
    if (!cursor) return null;
    const [lon, lat] = cursor.lngLat;
    const lines = [...this.fieldData.loadedLayers()]
      .sort((a, b) => a.order - b.order)
      .map((layer) => {
        if (layer.entry.type === 'colormap') {
          const value = sampleGrid(layer.grids[layer.entry.parameter], lon, lat);
          return `${layer.entry.label}: ${formatParameterValue(layer.entry.parameter, value)}`;
        }
        const speed = sampleGrid(layer.grids[layer.entry.speedParameter], lon, lat);
        const direction = sampleGrid(layer.grids[layer.entry.directionParameter], lon, lat);
        return `${layer.entry.label}: ${formatWind(speed, direction)}`;
      });
    if (!lines.length) return null;
    return { point: cursor.point, lines };
  });
}
```

`src/app/pages/home/hover-readout/hover-readout.html` (physical pixel positioning is correct
here — cursor coordinates are physical):

```html
@if (readout(); as hover) {
  <div
    class="pointer-events-none absolute z-10 rounded-md border border-panel-border bg-panel/90 px-2 py-1 text-xs"
    [style.left.px]="hover.point[0] + 14"
    [style.top.px]="hover.point[1] + 14"
  >
    @for (line of hover.lines; track line) {
      <div>{{ line }}</div>
    }
  </div>
}
```

- [ ] **Step 4: Frame-AOI**

`src/app/pages/home/frame-aoi/aois.ts` (invented placeholders — the lead supplies real ones
later):

```ts
import { Bounds } from '../../../types/field-grid';

export interface AreaOfInterest {
  id: string;
  label: string;
  bounds: Bounds;
}

export const areasOfInterest: AreaOfInterest[] = [
  { id: 'east-med', label: 'מזרח הים התיכון', bounds: [25, 30, 37, 38] },
  { id: 'red-sea', label: 'ים סוף', bounds: [32, 12, 44, 30] },
  { id: 'gulf', label: 'המפרץ', bounds: [46, 23, 57, 31] },
];
```

`src/app/pages/home/frame-aoi/frame-aoi.ts`:

```ts
import { Component, inject, signal } from '@angular/core';
import { MapEngine } from '../../../engine/map-engine';
import { AreaOfInterest, areasOfInterest } from './aois';

@Component({
  selector: 'app-frame-aoi',
  templateUrl: './frame-aoi.html',
  styleUrl: './frame-aoi.css',
})
export class FrameAoi {
  private engine = inject(MapEngine);
  areas = areasOfInterest;
  open = signal(false);

  frame(area: AreaOfInterest): void {
    this.open.set(false);
    this.engine.flyToBounds(area.bounds);
  }
}
```

`src/app/pages/home/frame-aoi/frame-aoi.html`:

```html
<div class="flex flex-col gap-2 rounded-md border border-panel-border bg-panel/90 p-2">
  <button class="rounded px-2 py-1 text-sm" (click)="open.set(!open())">מסגור אזור</button>
  @if (open()) {
    @for (area of areas; track area.id) {
      <button class="rounded px-2 py-1 text-sm" (click)="frame(area)">{{ area.label }}</button>
    }
  }
</div>
```

- [ ] **Step 5: Mount everything in the home page**

`src/app/pages/home/home-page.ts` — extend the `imports` array:

```ts
import { FrameAoi } from './frame-aoi/frame-aoi';
import { HoverReadout } from './hover-readout/hover-readout';
import { LayerBar } from './layer-bar/layer-bar';
import { TimeBar } from './time-bar/time-bar';
```

```ts
  imports: [PerfHud, TimeBar, LayerBar, HoverReadout, FrameAoi],
```

`src/app/pages/home/home-page.html`:

```html
<div class="relative h-full">
  <div #mapContainer class="h-full w-full"></div>
  <div class="absolute end-3 top-3 flex flex-col gap-2">
    <div class="flex flex-col gap-2 rounded-md border border-panel-border bg-panel/90 p-2">
      @for (item of basemaps; track item.id) {
        <button
          class="rounded px-2 py-1 text-sm"
          [class.bg-accent]="basemap() === item.id"
          [class.text-app]="basemap() === item.id"
          (click)="setBasemap(item.id)"
        >
          {{ item.label }}
        </button>
      }
    </div>
    <app-frame-aoi />
  </div>
  @if (engineReady()) {
    <app-layer-bar class="absolute bottom-0 start-0 top-0 block" />
    <app-time-bar class="absolute bottom-3 end-3 start-60 block" />
    <app-hover-readout />
  }
  <app-perf-hud />
</div>
```

- [ ] **Step 6: Verify the whole slice behavior**

Run: `npm run typecheck`, `npm test`, `npm run lint` → all clean. `npm start` →
- Layer bar docked on the **right** (RTL start side), full height; toggle the wave layer on —
  stepped bands appear; opacity sliders work live; ↑/↓ reorder wave above/below temperature.
- Time bar at the bottom: drag → both layers refetch + rerender; ←/→ keys step; עכשיו jumps
  back; Local-time label updates (Hebrew weekday).
- Hover: tooltip follows the cursor with `טמפרטורה: 23°C`, `רוח: 12 kt / 240°` lines (wave line
  appears when active; shows `—` over its fake land); the layer-bar checkbox turns it off/on.
- Frame-AOI: each placeholder flies the camera to its bounds.

- [ ] **Step 7: Commit**

```bash
git add src/app/pages/home
git commit -m "feat: slice-1 UI chrome (time bar, layer bar, hover readout, frame-AOI)"
```

---

## Task 11: Cleanup, docs, final verification

**Files:**
- Delete: all five temp spec files (`src/app/utils/*.spec.ts`, `src/app/units/units.spec.ts`, `src/app/dev/fixture-backend/grid-window.spec.ts`, `src/app/engine/renderers/colormap-renderer.spec.ts`)
- Modify: `CLAUDE.md` (§3 stack row, §6 quarantine exception, §11 status), `docs/dev/vendored-dependencies.md`

- [ ] **Step 1: Full verification pass (the spec's list)**

With `npm start` running, walk `docs/specs/slice-1.md` → Verification top to bottom, including:
- model auto-switch on zoom across z5; pan past padding refetches; outside-coverage pan degrades
  cleanly;
- high-latitude colormap alignment;
- perf HUD 60 fps at defaults / knobs scale (capture numbers);
- production build smoke: `npm run build` then `npm run serve:dist`, confirm clean boot and
  **no `/api` interception** (layers absent in prod build is EXPECTED — there is no backend;
  confirm no errors beyond the failed `/api` requests);
- Chrome-for-Testing 113 smoke test (repeat the procedure recorded in
  `docs/plans/2026-06-10-slice-0-foundation-and-spike.md`);
- RTL/Hebrew spot-check of the new chrome.

- [ ] **Step 2: Delete the temporary Vitest checks**

Delete the five `.spec.ts` files. Run: `npm test` → "no test files found" is acceptable;
`npm run typecheck` + `npm run lint` → clean.

- [ ] **Step 3: Docs**

- `CLAUDE.md` §3 map-engine row → "**MapLibre GL JS + deck.gl** with **first-party weather-layer
  renderers** (WeatherLayers GL removed 2026-06; globe returns after first-party particles are
  verified)".
- `CLAUDE.md` §6 `dev/` quarantine bullet → append: "(one recorded exception:
  `environment.development.ts` registers the dev fixture-backend interceptor; prod builds swap
  the file out via `fileReplacements`)".
- `CLAUDE.md` §11 status → "Slice 1 complete (date, verification numbers captured in the plan);
  next: write the Slice 2 spec (full layer system + panel + levels per the roadmap)".
- `docs/dev/vendored-dependencies.md` → remove `weatherlayers-gl`, add `@deck.gl/layers`.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: slice-1 close-out — temp specs deleted, docs updated, verification recorded"
```

---

## Self-review checklist (done while writing)

- Spec coverage: contract ✔ (T5/T7), stores ✔ (T6), registry/definition ✔ (T4), renderers ✔
  (T8/T9), missing data + visibleRange ✔ (T1/T8/T9/T10), mercator fix ✔ (T8), time UX ✔
  (T6/T10), hover + units ✔ (T3/T10), frame-AOI ✔ (T10), env swap + quarantine note ✔ (T5/T11),
  weatherlayers removal ✔ (T9/T11), temp-test deletion ✔ (T11).
- Names used across tasks are consistent: `FieldData.loadedLayers`, `LayersStore.states/stateOf/
  toggle/setOpacity/move/hoverReadoutEnabled/toggleHoverReadout`, `TimeStore.currentTime/window/
  stepHours/jumpTo/stepForward/stepBack/jumpToNow`, `MapEngine.viewBounds/zoom/cursor/
  flyToBounds/addLayer/removeLayer`, `parseFieldGrid/sampleGrid/sampleVectorField/mapGridValues/
  toVectorField`, `knotsToMetersPerSecond/formatParameterValue/formatWind/MISSING_VALUE_TEXT`.
