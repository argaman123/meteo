import type { Layer } from '@deck.gl/core';
import { LineLayer } from '@deck.gl/layers';
import { ParticleLayerDefinition } from '../../layers/layer-definition';
import { Bounds, VectorField } from '../../types/field-grid';
import { sampleVectorField } from '../../utils/grids';
import { inverseMercatorY, mercatorY } from '../../utils/mercator';

const TRAIL_POINTS = 14;
const TRAIL_FADE_POWER = 1.3;
const PATH_POINTS = 24;
const MAX_SLOTS_PER_CELL = 3;
export const MAX_PARTICLE_GRID_CELLS = 6000;
const GAP_CELL_FRACTION = 0.35;
const MIN_TRAIL_CELL_FRACTION = 0.08;
const MAX_TRAIL_CELL_FRACTION = 0.85;
const FADE_IN_FRACTION = 0.15;
const FADE_OUT_FRACTION = 0.35;
const MINIMUM_CROSSING_SECONDS = 1.8;
const SPAN_FRACTION_PER_SECOND_PER_METER_PER_SECOND = 0.0018;
const FLOOR_CURVE_MINIMUM_METERS_PER_SECOND = 3;
const FLOOR_CURVE_MAXIMUM_METERS_PER_SECOND = 25;
const TRAIL_SPEED_PIVOT_METERS_PER_SECOND = 18;
const BASE_LINE_WIDTH_PIXELS = 1.5;
const FAST_DIMMING_PIVOT_METERS_PER_SECOND = 12;
const FAST_DIMMING_MINIMUM_ALPHA = 0.45;
const GOLDEN_RATIO_FRACTION = 0.618033988749895;
const TRAIL_COLOR: [number, number, number] = [255, 255, 255];

export class ParticleSystem {
  readonly count: number;
  readonly gridCols: number;
  readonly gridRows: number;
  private headProgress: Float32Array;
  private active: Uint8Array;
  private cellCenterLon: Float32Array;
  private cellCenterLat: Float32Array;
  private cellHeightDegrees: Float32Array;
  private pathPoints: Float32Array;
  private pathLength: Float32Array;
  private crossDistance: Float32Array;
  private cellSpeed: Float32Array;
  private sources: Float32Array;
  private targets: Float32Array;
  private colors: Uint8Array;
  private trailAlphas: Float32Array;
  private trailLon: Float32Array;
  private trailLat: Float32Array;
  private bounds: Bounds;
  private numCells: number;
  private cellWidthDegrees: number;

  constructor(
    readonly wind: VectorField,
    gridCols: number,
    gridRows: number,
  ) {
    this.bounds = wind.bounds;
    const [west, south, east, north] = this.bounds;
    this.gridCols = Math.max(1, gridCols);
    this.gridRows = Math.max(1, gridRows);
    if (this.gridCols * this.gridRows > MAX_PARTICLE_GRID_CELLS) {
      this.gridRows = Math.max(1, Math.floor(MAX_PARTICLE_GRID_CELLS / this.gridCols));
    }
    this.numCells = this.gridCols * this.gridRows;
    this.cellWidthDegrees = (east - west) / this.gridCols;
    this.count = this.numCells * MAX_SLOTS_PER_CELL;

    this.headProgress = new Float32Array(this.count);
    this.active = new Uint8Array(this.count);
    this.cellCenterLon = new Float32Array(this.numCells);
    this.cellCenterLat = new Float32Array(this.numCells);
    this.cellHeightDegrees = new Float32Array(this.numCells);
    this.pathPoints = new Float32Array(this.numCells * PATH_POINTS * 2);
    this.pathLength = new Float32Array(this.numCells);
    this.crossDistance = new Float32Array(this.numCells);
    this.cellSpeed = new Float32Array(this.numCells);

    const segments = this.count * (TRAIL_POINTS - 1);
    this.sources = new Float32Array(segments * 2);
    this.targets = new Float32Array(segments * 2);
    this.colors = new Uint8Array(segments * 4);
    this.trailAlphas = new Float32Array(TRAIL_POINTS - 1);
    this.trailLon = new Float32Array(TRAIL_POINTS);
    this.trailLat = new Float32Array(TRAIL_POINTS);
    for (let t = 0; t < TRAIL_POINTS - 1; t++) {
      this.trailAlphas[t] = (1 - t / (TRAIL_POINTS - 1)) ** TRAIL_FADE_POWER;
    }

    const yNorth = mercatorY(north);
    const ySouth = mercatorY(south);
    for (let row = 0; row < this.gridRows; row++) {
      const latTop = inverseMercatorY(yNorth + ((ySouth - yNorth) * row) / this.gridRows);
      const latBottom = inverseMercatorY(yNorth + ((ySouth - yNorth) * (row + 1)) / this.gridRows);
      for (let col = 0; col < this.gridCols; col++) {
        const cell = row * this.gridCols + col;
        this.cellCenterLon[cell] = west + ((col + 0.5) / this.gridCols) * (east - west);
        this.cellCenterLat[cell] = (latTop + latBottom) / 2;
        this.cellHeightDegrees[cell] = latTop - latBottom;
      }
    }
    for (let cell = 0; cell < this.numCells; cell++) {
      this.buildCellPath(cell);
      if (this.pathLength[cell] > 0) {
        this.headProgress[cell] = (cell * GOLDEN_RATIO_FRACTION) % 0.5;
        this.active[cell] = 1;
      }
    }
  }

  step(deltaSeconds: number, speedFactor: number): void {
    const dataSpan = this.bounds[2] - this.bounds[0];
    const spanScale =
      SPAN_FRACTION_PER_SECOND_PER_METER_PER_SECOND * dataSpan * speedFactor * deltaSeconds;
    const maxIncrement = (deltaSeconds * speedFactor) / MINIMUM_CROSSING_SECONDS;
    for (let i = 0; i < this.count; i++) {
      if (!this.active[i]) continue;
      const cell = i % this.numCells;
      const crossing = this.crossDistance[cell];
      if (crossing <= 0) {
        this.active[i] = 0;
        continue;
      }
      const stepDegrees = flooredSpeed(this.cellSpeed[cell]) * spanScale;
      this.headProgress[i] += Math.min(stepDegrees / crossing, maxIncrement);
      if (this.headProgress[i] >= 1) this.active[i] = 0;
    }
    for (let cell = 0; cell < this.numCells; cell++) {
      if (this.crossDistance[cell] <= 0) continue;
      const threshold = this.trailFraction(this.cellSpeed[cell]) + GAP_CELL_FRACTION;
      let activeCount = 0;
      let minProgress = Infinity;
      let freeSlot = -1;
      for (let s = 0; s < MAX_SLOTS_PER_CELL; s++) {
        const index = cell + s * this.numCells;
        if (this.active[index]) {
          activeCount++;
          if (this.headProgress[index] < minProgress) minProgress = this.headProgress[index];
        } else if (freeSlot < 0) {
          freeSlot = index;
        }
      }
      if (freeSlot < 0) continue;
      if (activeCount === 0 || minProgress >= threshold) {
        this.active[freeSlot] = 1;
        this.headProgress[freeSlot] = 0;
      }
    }
  }

  private trailFraction(speed: number): number {
    const norm = Math.min(1, speed / TRAIL_SPEED_PIVOT_METERS_PER_SECOND);
    return MIN_TRAIL_CELL_FRACTION + (MAX_TRAIL_CELL_FRACTION - MIN_TRAIL_CELL_FRACTION) * norm;
  }

  private fastDim(speed: number): number {
    return Math.max(
      FAST_DIMMING_MINIMUM_ALPHA,
      Math.min(1, FAST_DIMMING_PIVOT_METERS_PER_SECOND / Math.max(0.001, speed)),
    );
  }

  private buildCellPath(cell: number): void {
    const centerLon = this.cellCenterLon[cell];
    const centerLat = this.cellCenterLat[cell];
    const halfWidth = this.cellWidthDegrees / 2;
    const halfHeight = this.cellHeightDegrees[cell] / 2;
    const base = cell * PATH_POINTS * 2;
    const [centerU, centerV] = sampleVectorField(this.wind, centerLon, centerLat);
    const centerSpeed = Math.hypot(centerU, centerV);
    this.cellSpeed[cell] = Number.isNaN(centerSpeed) ? 0 : centerSpeed;
    if (Number.isNaN(centerU) || centerSpeed === 0) {
      this.pathLength[cell] = 0;
      this.crossDistance[cell] = 0;
      return;
    }
    const traceStep = Math.min(halfWidth, halfHeight) / 6;
    const chordToVerticalEdge =
      Math.abs(centerU) > 1e-6 ? halfWidth / (Math.abs(centerU) / centerSpeed) : Infinity;
    const chordToHorizontalEdge =
      Math.abs(centerV) > 1e-6 ? halfHeight / (Math.abs(centerV) / centerSpeed) : Infinity;
    const chord = 2 * Math.min(chordToVerticalEdge, chordToHorizontalEdge);

    let lon = centerLon;
    let lat = centerLat;
    for (let k = 0; k < 60; k++) {
      const [u, v] = sampleVectorField(this.wind, lon, lat);
      const speed = Math.hypot(u, v);
      if (Number.isNaN(u) || speed === 0) break;
      const dirLon = -u / speed;
      const dirLat = -v / speed;
      const reach = this.stepToBoundary(lon, lat, dirLon, dirLat, traceStep, centerLon, centerLat, halfWidth, halfHeight);
      if (reach <= 1e-9) break;
      lon += dirLon * reach;
      lat += dirLat * reach;
      if (reach < traceStep - 1e-9) break;
    }
    const entryLon = lon;
    const entryLat = lat;

    const xs = [entryLon];
    const ys = [entryLat];
    const cumulative = [0];
    let length = 0;
    lon = entryLon;
    lat = entryLat;
    for (let k = 0; k < 120; k++) {
      const [u, v] = sampleVectorField(this.wind, lon, lat);
      const speed = Math.hypot(u, v);
      if (Number.isNaN(u) || speed === 0) break;
      const dirLon = u / speed;
      const dirLat = v / speed;
      const reach = this.stepToBoundary(lon, lat, dirLon, dirLat, traceStep, centerLon, centerLat, halfWidth, halfHeight);
      if (reach <= 1e-9) break;
      lon += dirLon * reach;
      lat += dirLat * reach;
      length += reach;
      xs.push(lon);
      ys.push(lat);
      cumulative.push(length);
      if (reach < traceStep - 1e-9) break;
    }

    if (length < traceStep * 0.5 || xs.length < 2) {
      const dirLon = centerU / centerSpeed;
      const dirLat = centerV / centerSpeed;
      const far = Math.max(halfWidth, halfHeight) * 2;
      const back = this.stepToBoundary(centerLon, centerLat, -dirLon, -dirLat, far, centerLon, centerLat, halfWidth, halfHeight);
      const forward = this.stepToBoundary(centerLon, centerLat, dirLon, dirLat, far, centerLon, centerLat, halfWidth, halfHeight);
      const startLon = centerLon - dirLon * back;
      const startLat = centerLat - dirLat * back;
      const endLon = centerLon + dirLon * forward;
      const endLat = centerLat + dirLat * forward;
      for (let p = 0; p < PATH_POINTS; p++) {
        const fraction = p / (PATH_POINTS - 1);
        this.pathPoints[base + p * 2] = startLon + (endLon - startLon) * fraction;
        this.pathPoints[base + p * 2 + 1] = startLat + (endLat - startLat) * fraction;
      }
      this.pathLength[cell] = back + forward > 1e-6 ? back + forward : traceStep;
      this.crossDistance[cell] = Math.min(this.pathLength[cell], Math.max(traceStep, chord));
      return;
    }

    for (let p = 0; p < PATH_POINTS; p++) {
      const target = (length * p) / (PATH_POINTS - 1);
      let seg = 1;
      while (seg < cumulative.length - 1 && cumulative[seg] < target) seg++;
      const segLength = cumulative[seg] - cumulative[seg - 1];
      const fraction = segLength > 1e-9 ? (target - cumulative[seg - 1]) / segLength : 0;
      this.pathPoints[base + p * 2] = xs[seg - 1] + (xs[seg] - xs[seg - 1]) * fraction;
      this.pathPoints[base + p * 2 + 1] = ys[seg - 1] + (ys[seg] - ys[seg - 1]) * fraction;
    }
    this.pathLength[cell] = length;
    this.crossDistance[cell] = Math.min(length, Math.max(traceStep, chord));
  }

  private stepToBoundary(
    lon: number,
    lat: number,
    dirLon: number,
    dirLat: number,
    maxDistance: number,
    centerLon: number,
    centerLat: number,
    halfWidth: number,
    halfHeight: number,
  ): number {
    let reach = maxDistance;
    if (dirLon > 1e-9) reach = Math.min(reach, (centerLon + halfWidth - lon) / dirLon);
    else if (dirLon < -1e-9) reach = Math.min(reach, (centerLon - halfWidth - lon) / dirLon);
    if (dirLat > 1e-9) reach = Math.min(reach, (centerLat + halfHeight - lat) / dirLat);
    else if (dirLat < -1e-9) reach = Math.min(reach, (centerLat - halfHeight - lat) / dirLat);
    return Math.max(0, reach);
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
      if (!this.active[i]) continue;
      const cell = i % this.numCells;
      const length = this.pathLength[cell];
      if (length <= 0) continue;
      const progress = this.headProgress[i];
      const headArc = progress * this.crossDistance[cell];
      const trailLength = this.trailFraction(this.cellSpeed[cell]) * this.crossDistance[cell];
      const birthFade = Math.min(1, progress / FADE_IN_FRACTION);
      const deathFade = Math.min(1, (1 - progress) / FADE_OUT_FRACTION);
      const baseAlpha = birthFade * deathFade * this.fastDim(this.cellSpeed[cell]);
      const base = cell * PATH_POINTS * 2;
      for (let t = 0; t < TRAIL_POINTS; t++) {
        const arc = headArc - (t / (TRAIL_POINTS - 1)) * trailLength;
        const clamped = Math.max(0, Math.min(length, arc));
        const position = (clamped / length) * (PATH_POINTS - 1);
        const index = Math.min(PATH_POINTS - 2, Math.floor(position));
        const fraction = position - index;
        const offset = base + index * 2;
        this.trailLon[t] = this.pathPoints[offset] + (this.pathPoints[offset + 2] - this.pathPoints[offset]) * fraction;
        this.trailLat[t] =
          this.pathPoints[offset + 1] + (this.pathPoints[offset + 3] - this.pathPoints[offset + 1]) * fraction;
      }
      for (let t = 0; t < segmentsPerParticle; t++) {
        this.sources[segment * 2] = this.trailLon[t];
        this.sources[segment * 2 + 1] = this.trailLat[t];
        this.targets[segment * 2] = this.trailLon[t + 1];
        this.targets[segment * 2 + 1] = this.trailLat[t + 1];
        this.colors[segment * 4] = TRAIL_COLOR[0];
        this.colors[segment * 4 + 1] = TRAIL_COLOR[1];
        this.colors[segment * 4 + 2] = TRAIL_COLOR[2];
        this.colors[segment * 4 + 3] = Math.round(255 * this.trailAlphas[t] * baseAlpha);
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

}

export function particleLineWidth(): number {
  return BASE_LINE_WIDTH_PIXELS;
}

function flooredSpeed(speed: number): number {
  return Math.min(
    FLOOR_CURVE_MAXIMUM_METERS_PER_SECOND,
    Math.max(speed, FLOOR_CURVE_MINIMUM_METERS_PER_SECOND),
  );
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
