import type { Layer } from '@deck.gl/core';
import { LineLayer } from '@deck.gl/layers';
import { ParticleLayerDefinition } from '../../layers/layer-definition';
import { ParticleTuning } from '../../settings/particle-settings';
import { Bounds, VectorField } from '../../types/field-grid';
import { sampleVectorField } from '../../utils/grids';

const TRAIL_POINTS = 12;
const TRAIL_FADE_POWER = 1.3;
const MAX_PARTICLES = 6000;
const MIN_TRAIL_CELL_FRACTION = 0.18;
const MAX_TRAIL_CELL_FRACTION = 0.85;
const FADE_IN_FRACTION = 0.1;
const FADE_OUT_FRACTION = 0.28;
const SPAN_FRACTION_PER_SECOND_PER_METER_PER_SECOND = 0.0018;
const FIXED_REFERENCE_SPAN_DEGREES = 40;
const SQRT_CURVE_PIVOT_METERS_PER_SECOND = 10;
const FLOOR_CURVE_MINIMUM_METERS_PER_SECOND = 3;
const FLOOR_CURVE_MAXIMUM_METERS_PER_SECOND = 25;
const WINDY_CURVE_POWER = 0.7;
const WINDY_CURVE_MINIMUM_METERS_PER_SECOND = 1.5;
const WINDY_CURVE_MAXIMUM_METERS_PER_SECOND = 30;
const TRAIL_SPEED_PIVOT_METERS_PER_SECOND = 14;
const BASE_LINE_WIDTH_PIXELS = 1.5;
const FAST_DIMMING_PIVOT_METERS_PER_SECOND = 12;
const FAST_DIMMING_MINIMUM_ALPHA = 0.45;
const GOLDEN_RATIO_FRACTION = 0.618033988749895;

export class ParticleSystem {
  readonly count: number;
  readonly cellSizeDegrees: number;
  readonly gridCols: number;
  readonly gridRows: number;
  private starts: Float32Array;
  private directions: Float32Array;
  private crossDistances: Float32Array;
  private rawSpeeds: Float32Array;
  private progress: Float32Array;
  private homeU: Float32Array;
  private homeV: Float32Array;
  private sources: Float32Array;
  private targets: Float32Array;
  private colors: Uint8Array;
  private trailAlphas: Float32Array;
  private bounds: Bounds;
  private numCells: number;
  private cellWidthDegrees: number;
  private cellHeightDegrees: number;

  constructor(
    readonly wind: VectorField,
    cellSizeDegrees: number,
  ) {
    this.cellSizeDegrees = cellSizeDegrees;
    this.bounds = wind.bounds;
    const [west, south, east, north] = this.bounds;
    const widthDegrees = east - west;
    const heightDegrees = north - south;
    this.gridCols = Math.max(1, Math.round(widthDegrees / cellSizeDegrees));
    this.gridRows = Math.max(1, Math.round(heightDegrees / cellSizeDegrees));
    this.numCells = this.gridCols * this.gridRows;
    this.cellWidthDegrees = widthDegrees / this.gridCols;
    this.cellHeightDegrees = heightDegrees / this.gridRows;
    this.count = Math.min(MAX_PARTICLES, this.numCells);

    this.starts = new Float32Array(this.count * 2);
    this.directions = new Float32Array(this.count * 2);
    this.crossDistances = new Float32Array(this.count).fill(this.cellWidthDegrees);
    this.rawSpeeds = new Float32Array(this.count);
    this.progress = new Float32Array(this.count);
    this.homeU = new Float32Array(this.count);
    this.homeV = new Float32Array(this.count);
    const segments = this.count * (TRAIL_POINTS - 1);
    this.sources = new Float32Array(segments * 2);
    this.targets = new Float32Array(segments * 2);
    this.colors = new Uint8Array(segments * 4);
    this.trailAlphas = new Float32Array(TRAIL_POINTS - 1);
    for (let t = 0; t < TRAIL_POINTS - 1; t++) {
      this.trailAlphas[t] = (1 - t / (TRAIL_POINTS - 1)) ** TRAIL_FADE_POWER;
    }
    for (let i = 0; i < segments * 4; i += 4) {
      this.colors[i] = 255;
      this.colors[i + 1] = 255;
      this.colors[i + 2] = 255;
    }
    for (let i = 0; i < this.count; i++) {
      const col = i % this.gridCols;
      const row = Math.floor(i / this.gridCols);
      this.homeU[i] = (col + 0.5) / this.gridCols;
      this.homeV[i] = (row + 0.5) / this.gridRows;
      this.emitFromCell(i, (i * GOLDEN_RATIO_FRACTION) % 1);
    }
  }

  step(deltaSeconds: number, tuning: ParticleTuning): void {
    const referenceSpan = this.referenceSpan(tuning.speedReference);
    const spanScale =
      SPAN_FRACTION_PER_SECOND_PER_METER_PER_SECOND *
      referenceSpan *
      tuning.speedFactor *
      deltaSeconds;
    for (let i = 0; i < this.count; i++) {
      const rawSpeed = this.rawSpeeds[i];
      if (rawSpeed <= 0) continue;
      const stepDegrees = curveSpeed(rawSpeed, tuning.speedCurve) * spanScale;
      this.progress[i] += stepDegrees / this.crossDistances[i];
      if (this.progress[i] >= 1) this.emitFromCell(i, 0);
    }
  }

  private referenceSpan(reference: ParticleTuning['speedReference']): number {
    if (reference === 'fixed') return FIXED_REFERENCE_SPAN_DEGREES;
    return this.bounds[2] - this.bounds[0];
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
    const segmentsPerParticle = TRAIL_POINTS - 1;
    for (let i = 0; i < this.count; i++) {
      const rawSpeed = this.rawSpeeds[i];
      const fraction = this.progress[i];
      const startLon = this.starts[i * 2];
      const startLat = this.starts[i * 2 + 1];
      const dirLon = this.directions[i * 2];
      const dirLat = this.directions[i * 2 + 1];
      const crossDistance = this.crossDistances[i];
      const headDistance = fraction * crossDistance;
      const headLon = startLon + dirLon * headDistance;
      const headLat = startLat + dirLat * headDistance;
      const speedNorm = Math.min(1, rawSpeed / TRAIL_SPEED_PIVOT_METERS_PER_SECOND);
      const trailFraction =
        MIN_TRAIL_CELL_FRACTION + (MAX_TRAIL_CELL_FRACTION - MIN_TRAIL_CELL_FRACTION) * speedNorm;
      const visibleLength = Math.min(trailFraction * crossDistance, headDistance);
      const fastDim = Math.max(
        FAST_DIMMING_MINIMUM_ALPHA,
        Math.min(1, FAST_DIMMING_PIVOT_METERS_PER_SECOND / Math.max(0.001, rawSpeed)),
      );
      const birthFade = Math.min(1, fraction / FADE_IN_FRACTION);
      const deathFade = Math.min(1, (1 - fraction) / FADE_OUT_FRACTION);
      const endFade = rawSpeed <= 0 ? 0 : birthFade * deathFade * fastDim;
      for (let t = 0; t < segmentsPerParticle; t++) {
        const d0 = (t / (TRAIL_POINTS - 1)) * visibleLength;
        const d1 = ((t + 1) / (TRAIL_POINTS - 1)) * visibleLength;
        this.sources[segment * 2] = headLon - dirLon * d0;
        this.sources[segment * 2 + 1] = headLat - dirLat * d0;
        this.targets[segment * 2] = headLon - dirLon * d1;
        this.targets[segment * 2 + 1] = headLat - dirLat * d1;
        this.colors[segment * 4 + 3] = Math.round(255 * this.trailAlphas[t] * endFade);
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

  private emitFromCell(index: number, startProgress: number): void {
    const [west, south, east, north] = this.bounds;
    const centerLon = west + this.homeU[index] * (east - west);
    const centerLat = south + this.homeV[index] * (north - south);
    const [u, v] = sampleVectorField(this.wind, centerLon, centerLat);
    const speed = Math.hypot(u, v);
    if (Number.isNaN(u) || speed === 0) {
      this.rawSpeeds[index] = 0;
      this.progress[index] = startProgress;
      return;
    }
    const dirLon = u / speed;
    const dirLat = v / speed;
    const toVerticalEdge =
      Math.abs(dirLon) > 1e-6 ? this.cellWidthDegrees / 2 / Math.abs(dirLon) : Infinity;
    const toHorizontalEdge =
      Math.abs(dirLat) > 1e-6 ? this.cellHeightDegrees / 2 / Math.abs(dirLat) : Infinity;
    const crossHalf = Math.min(toVerticalEdge, toHorizontalEdge);
    this.crossDistances[index] = 2 * crossHalf;
    this.directions[index * 2] = dirLon;
    this.directions[index * 2 + 1] = dirLat;
    this.starts[index * 2] = centerLon - dirLon * crossHalf;
    this.starts[index * 2 + 1] = centerLat - dirLat * crossHalf;
    this.rawSpeeds[index] = speed;
    this.progress[index] = startProgress;
  }
}

export function particleLineWidth(): number {
  return BASE_LINE_WIDTH_PIXELS;
}

export function renderCellGrid(id: string, system: ParticleSystem): Layer {
  const [west, south, east, north] = system.wind.bounds;
  const lines: { source: [number, number]; target: [number, number] }[] = [];
  for (let k = 0; k <= system.gridCols; k++) {
    const lon = west + ((east - west) * k) / system.gridCols;
    lines.push({ source: [lon, south], target: [lon, north] });
  }
  for (let j = 0; j <= system.gridRows; j++) {
    const lat = south + ((north - south) * j) / system.gridRows;
    lines.push({ source: [west, lat], target: [east, lat] });
  }
  return new LineLayer<(typeof lines)[number]>({
    id,
    data: lines,
    getSourcePosition: (line) => line.source,
    getTargetPosition: (line) => line.target,
    getColor: [255, 210, 0, 110],
    getWidth: 1,
    widthUnits: 'pixels',
  });
}

function curveSpeed(speed: number, curve: ParticleTuning['speedCurve']): number {
  if (curve === 'sqrt') return Math.sqrt(speed * SQRT_CURVE_PIVOT_METERS_PER_SECOND);
  if (curve === 'floor') {
    return Math.min(
      FLOOR_CURVE_MAXIMUM_METERS_PER_SECOND,
      Math.max(speed, FLOOR_CURVE_MINIMUM_METERS_PER_SECOND),
    );
  }
  if (curve === 'windy') {
    const clamped = Math.min(
      WINDY_CURVE_MAXIMUM_METERS_PER_SECOND,
      Math.max(WINDY_CURVE_MINIMUM_METERS_PER_SECOND, speed),
    );
    return (
      SQRT_CURVE_PIVOT_METERS_PER_SECOND ** (1 - WINDY_CURVE_POWER) * clamped ** WINDY_CURVE_POWER
    );
  }
  return speed;
}

export function renderParticleLayer(
  definition: ParticleLayerDefinition,
  system: ParticleSystem,
  widthPixels: number,
): Layer {
  return new LineLayer({
    id: definition.entry.id,
    data: system.layerData(),
    getWidth: widthPixels,
    widthUnits: 'pixels',
    opacity: definition.opacity,
  });
}
