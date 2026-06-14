import type { Layer } from '@deck.gl/core';
import { LineLayer, ScatterplotLayer } from '@deck.gl/layers';
import { ParticleLayerDefinition } from '../../layers/layer-definition';
import { ParticleTuning } from '../../settings/particle-settings';
import { Bounds, VectorField } from '../../types/field-grid';
import { sampleVectorField } from '../../utils/grids';

const TRAIL_POINTS = 14;
const TRAIL_FADE_POWER = 1.3;
const PARTICLES_PER_CELL = 2;
const MAX_PARTICLES = 8000;
const MIN_TRAIL_CELL_FRACTION = 0.18;
const MAX_TRAIL_CELL_FRACTION = 0.85;
const LENGTH_FADE_BAND_FRACTION = 0.4;
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
const MIN_LATITUDE_COSINE = 0.2;
const CHESS_COLOR_A: [number, number, number] = [255, 255, 255];
const CHESS_COLOR_B: [number, number, number] = [110, 200, 255];

export class ParticleSystem {
  readonly count: number;
  readonly gridCols: number;
  readonly gridRows: number;
  private history: Float32Array;
  private progress: Float32Array;
  private crossDistances: Float32Array;
  private rawSpeeds: Float32Array;
  private sampleDistances: Float32Array;
  private distanceSinceSample: Float32Array;
  private startPoints: Float32Array;
  private cellParity: Uint8Array;
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
    gridCols: number,
    gridRows: number,
  ) {
    this.bounds = wind.bounds;
    const [west, south, east, north] = this.bounds;
    this.gridCols = Math.max(1, gridCols);
    this.gridRows = Math.max(1, gridRows);
    this.numCells = this.gridCols * this.gridRows;
    this.cellWidthDegrees = (east - west) / this.gridCols;
    this.cellHeightDegrees = (north - south) / this.gridRows;
    this.count = Math.min(MAX_PARTICLES, this.numCells * PARTICLES_PER_CELL);

    this.history = new Float32Array(TRAIL_POINTS * this.count * 2);
    this.progress = new Float32Array(this.count);
    this.crossDistances = new Float32Array(this.count).fill(this.cellWidthDegrees);
    this.rawSpeeds = new Float32Array(this.count);
    this.sampleDistances = new Float32Array(this.count).fill(this.cellWidthDegrees);
    this.distanceSinceSample = new Float32Array(this.count);
    this.startPoints = new Float32Array(this.count * 2);
    this.cellParity = new Uint8Array(this.count);
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
    for (let i = 0; i < this.count; i++) {
      const cell = i % this.numCells;
      const slot = Math.floor(i / this.numCells);
      const col = cell % this.gridCols;
      const row = Math.floor(cell / this.gridCols);
      this.homeU[i] = (col + 0.5) / this.gridCols;
      this.homeV[i] = (row + 0.5) / this.gridRows;
      this.cellParity[i] = (col + row) % 2;
      const cellOffset = (cell * GOLDEN_RATIO_FRACTION) % 1;
      this.emitFromCell(i, (slot / PARTICLES_PER_CELL + cellOffset) % 1);
    }
  }

  step(deltaSeconds: number, tuning: ParticleTuning): void {
    const stride = this.count * 2;
    const referenceSpan = this.referenceSpan(tuning.speedReference);
    const spanScale =
      SPAN_FRACTION_PER_SECOND_PER_METER_PER_SECOND *
      referenceSpan *
      tuning.speedFactor *
      deltaSeconds;
    for (let i = 0; i < this.count; i++) {
      if (this.rawSpeeds[i] <= 0) {
        this.emitFromCell(i, 0);
        continue;
      }
      const lon = this.history[i * 2];
      const lat = this.history[i * 2 + 1];
      const [u, v] = sampleVectorField(this.wind, lon, lat);
      if (Number.isNaN(u)) {
        this.emitFromCell(i, 0);
        continue;
      }
      const speed = Math.hypot(u, v);
      if (speed === 0) continue;
      this.rawSpeeds[i] = speed;
      const stepDegrees = curveSpeed(speed, tuning.speedCurve) * spanScale;
      const latitudeCosine = tuning.latitudeCorrection
        ? Math.max(MIN_LATITUDE_COSINE, Math.cos((lat * Math.PI) / 180))
        : 1;
      this.history[i * 2] = lon + ((u / speed) * stepDegrees) / latitudeCosine;
      this.history[i * 2 + 1] = lat + (v / speed) * stepDegrees;
      this.progress[i] += stepDegrees / this.crossDistances[i];
      this.distanceSinceSample[i] += stepDegrees;
      if (this.distanceSinceSample[i] >= this.sampleDistances[i]) {
        for (let t = TRAIL_POINTS - 1; t > 0; t--) {
          this.history[t * stride + i * 2] = this.history[(t - 1) * stride + i * 2];
          this.history[t * stride + i * 2 + 1] = this.history[(t - 1) * stride + i * 2 + 1];
        }
        this.distanceSinceSample[i] -= this.sampleDistances[i];
      }
      if (this.progress[i] >= 1) this.emitFromCell(i, 0);
    }
  }

  private referenceSpan(reference: ParticleTuning['speedReference']): number {
    if (reference === 'fixed') return FIXED_REFERENCE_SPAN_DEGREES;
    return this.bounds[2] - this.bounds[0];
  }

  layerData(debug: boolean): {
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
    for (let i = 0; i < this.count; i++) {
      const rawSpeed = this.rawSpeeds[i];
      const fraction = this.progress[i];
      const speedNorm = Math.min(1, rawSpeed / TRAIL_SPEED_PIVOT_METERS_PER_SECOND);
      const trailFraction =
        MIN_TRAIL_CELL_FRACTION + (MAX_TRAIL_CELL_FRACTION - MIN_TRAIL_CELL_FRACTION) * speedNorm;
      const visibleLength = trailFraction * this.crossDistances[i];
      const lengthFadeBand = visibleLength * LENGTH_FADE_BAND_FRACTION;
      const fastDim = Math.max(
        FAST_DIMMING_MINIMUM_ALPHA,
        Math.min(1, FAST_DIMMING_PIVOT_METERS_PER_SECOND / Math.max(0.001, rawSpeed)),
      );
      const birthFade = Math.min(1, fraction / FADE_IN_FRACTION);
      const deathFade = Math.min(1, (1 - fraction) / FADE_OUT_FRACTION);
      const endFade = rawSpeed <= 0 ? 0 : birthFade * deathFade * fastDim;
      const color = debug && this.cellParity[i] === 1 ? CHESS_COLOR_B : CHESS_COLOR_A;
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
        const lengthMask = Math.max(0, Math.min(1, (visibleLength - trailDistance) / lengthFadeBand));
        this.colors[segment * 4] = color[0];
        this.colors[segment * 4 + 1] = color[1];
        this.colors[segment * 4 + 2] = color[2];
        this.colors[segment * 4 + 3] = Math.round(255 * this.trailAlphas[t] * endFade * lengthMask);
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

  startMarkers(): [number, number][] {
    const points: [number, number][] = [];
    for (let i = 0; i < this.count; i++) {
      if (this.rawSpeeds[i] <= 0) continue;
      points.push([this.startPoints[i * 2], this.startPoints[i * 2 + 1]]);
    }
    return points;
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
    const cross = 2 * crossHalf;
    const startLon = centerLon - dirLon * crossHalf;
    const startLat = centerLat - dirLat * crossHalf;
    const headLon = startLon + dirLon * startProgress * cross;
    const headLat = startLat + dirLat * startProgress * cross;
    this.crossDistances[index] = cross;
    this.rawSpeeds[index] = speed;
    this.progress[index] = startProgress;
    this.sampleDistances[index] = (MAX_TRAIL_CELL_FRACTION * cross) / (TRAIL_POINTS - 1);
    this.distanceSinceSample[index] = 0;
    this.startPoints[index * 2] = startLon;
    this.startPoints[index * 2 + 1] = startLat;
    for (let t = 0; t < TRAIL_POINTS; t++) {
      this.history[t * this.count * 2 + index * 2] = headLon;
      this.history[t * this.count * 2 + index * 2 + 1] = headLat;
    }
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
    getColor: [255, 210, 0, 90],
    getWidth: 1,
    widthUnits: 'pixels',
  });
}

export function renderStartMarkers(id: string, system: ParticleSystem): Layer {
  return new ScatterplotLayer<[number, number]>({
    id,
    data: system.startMarkers(),
    getPosition: (point) => point,
    getFillColor: [255, 90, 90, 220],
    getRadius: 3,
    radiusUnits: 'pixels',
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
  debug: boolean,
): Layer {
  return new LineLayer({
    id: definition.entry.id,
    data: system.layerData(debug),
    getWidth: widthPixels,
    widthUnits: 'pixels',
    opacity: definition.opacity,
  });
}
