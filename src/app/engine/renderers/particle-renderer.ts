import type { Layer } from '@deck.gl/core';
import { LineLayer } from '@deck.gl/layers';
import { ParticleLayerDefinition } from '../../layers/layer-definition';
import { ParticleTuning } from '../../settings/particle-settings';
import { Bounds, VectorField } from '../../types/field-grid';
import { sampleVectorField } from '../../utils/grids';

const TRAIL_POINTS = 16;
const TRAIL_SAMPLE_SECONDS = 0.04;
const TRAIL_FADE_POWER = 1.4;
const PARTICLES_PER_CELL = 2;
const MAX_PARTICLES = 6000;
const FADE_PROGRESS_FRACTION = 0.12;
const MAX_TRAIL_CELL_FRACTION = 0.35;
const SPAN_FRACTION_PER_SECOND_PER_METER_PER_SECOND = 0.0018;
const FIXED_REFERENCE_SPAN_DEGREES = 40;
const SQRT_CURVE_PIVOT_METERS_PER_SECOND = 10;
const FLOOR_CURVE_MINIMUM_METERS_PER_SECOND = 3;
const FLOOR_CURVE_MAXIMUM_METERS_PER_SECOND = 25;
const WINDY_CURVE_POWER = 0.7;
const WINDY_CURVE_MINIMUM_METERS_PER_SECOND = 1.5;
const WINDY_CURVE_MAXIMUM_METERS_PER_SECOND = 30;
const BASE_LINE_WIDTH_PIXELS = 1.5;
const FAST_DIMMING_PIVOT_METERS_PER_SECOND = 10;
const FAST_DIMMING_MINIMUM_ALPHA = 0.4;
const GOLDEN_RATIO_FRACTION = 0.618033988749895;
const DEATH_RECESSION_BAND = 0.5;
const MIN_LATITUDE_COSINE = 0.2;

export class ParticleSystem {
  readonly count: number;
  readonly cellSizeDegrees: number;
  readonly gridCols: number;
  readonly gridRows: number;
  private history: Float32Array;
  private progress: Float32Array;
  private speedAlphas: Float32Array;
  private homeU: Float32Array;
  private homeV: Float32Array;
  private sources: Float32Array;
  private targets: Float32Array;
  private colors: Uint8Array;
  private trailAlphas: Float32Array;
  private bounds: Bounds;
  private numCells: number;
  private cellTravelDegrees: number;
  private sinceTrailSample = 0;

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
    this.cellTravelDegrees = widthDegrees / this.gridCols;
    this.count = Math.min(MAX_PARTICLES, this.numCells * PARTICLES_PER_CELL);

    this.history = new Float32Array(TRAIL_POINTS * this.count * 2);
    this.progress = new Float32Array(this.count);
    this.speedAlphas = new Float32Array(this.count).fill(1);
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
      const cell = i % this.numCells;
      const col = cell % this.gridCols;
      const row = Math.floor(cell / this.gridCols);
      this.homeU[i] = (col + 0.5) / this.gridCols;
      this.homeV[i] = (row + 0.5) / this.gridRows;
      const slot = Math.floor(i / this.numCells);
      const cellPhase = (cell * GOLDEN_RATIO_FRACTION) % 1;
      const startProgress = ((slot + cellPhase) / PARTICLES_PER_CELL) % 1;
      this.emitFromCell(i, startProgress);
    }
  }

  step(deltaSeconds: number, tuning: ParticleTuning): void {
    const stride = this.count * 2;
    this.sinceTrailSample += deltaSeconds;
    if (this.sinceTrailSample >= TRAIL_SAMPLE_SECONDS) {
      this.history.copyWithin(stride, 0, stride * (TRAIL_POINTS - 1));
      this.sinceTrailSample = 0;
    }
    const referenceSpan = this.referenceSpan(tuning.speedReference);
    const spanScale =
      SPAN_FRACTION_PER_SECOND_PER_METER_PER_SECOND *
      referenceSpan *
      tuning.speedFactor *
      deltaSeconds;
    for (let i = 0; i < this.count; i++) {
      const lon = this.history[i * 2];
      const lat = this.history[i * 2 + 1];
      const [u, v] = sampleVectorField(this.wind, lon, lat);
      if (Number.isNaN(u)) {
        this.emitFromCell(i, 0);
        continue;
      }
      const speed = Math.hypot(u, v);
      if (speed === 0) continue;
      this.speedAlphas[i] = Math.max(
        FAST_DIMMING_MINIMUM_ALPHA,
        Math.min(1, FAST_DIMMING_PIVOT_METERS_PER_SECOND / speed),
      );
      const stepDegrees = curveSpeed(speed, tuning.speedCurve) * spanScale;
      this.progress[i] += stepDegrees / this.cellTravelDegrees;
      if (this.progress[i] >= 1) {
        this.emitFromCell(i, 0);
        continue;
      }
      const latitudeCosine = tuning.latitudeCorrection
        ? Math.max(MIN_LATITUDE_COSINE, Math.cos((lat * Math.PI) / 180))
        : 1;
      this.history[i * 2] = lon + ((u / speed) * stepDegrees) / latitudeCosine;
      this.history[i * 2 + 1] = lat + (v / speed) * stepDegrees;
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
    const stride = this.count * 2;
    const segmentsPerParticle = TRAIL_POINTS - 1;
    const maxTrailDegrees = MAX_TRAIL_CELL_FRACTION * this.cellTravelDegrees;
    const lengthFadeBand = maxTrailDegrees * 0.5;
    for (let i = 0; i < this.count; i++) {
      const fraction = this.progress[i];
      const birthFade = Math.min(1, fraction / FADE_PROGRESS_FRACTION) * this.speedAlphas[i];
      const deathWindow = Math.max(
        0,
        (fraction - (1 - FADE_PROGRESS_FRACTION)) / FADE_PROGRESS_FRACTION,
      );
      const recessionFront =
        1 + DEATH_RECESSION_BAND / 2 - deathWindow * (1 + DEATH_RECESSION_BAND);
      let trailDistance = 0;
      for (let t = 0; t < segmentsPerParticle; t++) {
        const sourceLon = this.history[t * stride + i * 2];
        const sourceLat = this.history[t * stride + i * 2 + 1];
        const targetLon = this.history[(t + 1) * stride + i * 2];
        const targetLat = this.history[(t + 1) * stride + i * 2 + 1];
        this.sources[segment * 2] = sourceLon;
        this.sources[segment * 2 + 1] = sourceLat;
        this.targets[segment * 2] = targetLon;
        this.targets[segment * 2 + 1] = targetLat;
        trailDistance += Math.hypot(targetLon - sourceLon, targetLat - sourceLat);
        const lengthMask = Math.max(0, Math.min(1, (maxTrailDegrees - trailDistance) / lengthFadeBand));
        const trailPosition = t / (segmentsPerParticle - 1);
        const deathErase = Math.max(
          0,
          Math.min(1, (recessionFront - trailPosition) / DEATH_RECESSION_BAND + 0.5),
        );
        this.colors[segment * 4 + 3] = Math.round(
          255 * this.trailAlphas[t] * birthFade * deathErase * lengthMask,
        );
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
    const anchorLon = west + this.homeU[index] * (east - west);
    const anchorLat = south + this.homeV[index] * (north - south);
    let lon = anchorLon;
    let lat = anchorLat;
    const [u, v] = sampleVectorField(this.wind, anchorLon, anchorLat);
    const speed = Math.hypot(u, v);
    if (!Number.isNaN(u) && speed > 0) {
      const travel = startProgress * this.cellTravelDegrees;
      lon = anchorLon + (u / speed) * travel;
      lat = anchorLat + (v / speed) * travel;
    }
    this.progress[index] = startProgress;
    for (let t = 0; t < TRAIL_POINTS; t++) {
      this.history[t * this.count * 2 + index * 2] = lon;
      this.history[t * this.count * 2 + index * 2 + 1] = lat;
    }
  }
}

export function particleLineWidth(): number {
  return BASE_LINE_WIDTH_PIXELS;
}

export function renderCellGrid(id: string, system: ParticleSystem): Layer {
  const [west, south, east, north] = system.wind.bounds;
  const lines: { source: [number, number]; target: [number, number]; anchor: boolean }[] = [];
  for (let k = 0; k <= system.gridCols; k++) {
    const lon = west + ((east - west) * k) / system.gridCols;
    lines.push({ source: [lon, south], target: [lon, north], anchor: false });
  }
  for (let j = 0; j <= system.gridRows; j++) {
    const lat = south + ((north - south) * j) / system.gridRows;
    lines.push({ source: [west, lat], target: [east, lat], anchor: false });
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
