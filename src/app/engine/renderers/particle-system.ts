import { ParticleMotion } from '../../layers/layer-definition';
import { Bounds, VectorField } from '../../types/field-grid';
import { sampleVectorField } from '../../utils/grids';
import { inverseMercatorY, mercatorY } from '../../utils/mercator';

// Universal simulation constants — independent of what the field means or how it is drawn.
const PATH_POINTS = 24;
const MAX_SLOTS_PER_CELL = 3;
export const MAX_PARTICLE_GRID_CELLS = 6000;
const MAX_SEGMENTS_PER_PARTICLE = 14;
const GAP_CELL_FRACTION = 0.35;
const MINIMUM_CROSSING_SECONDS = 1.8;
const SPAN_FRACTION_PER_SECOND_PER_METER_PER_SECOND = 0.0018;
const GOLDEN_RATIO_FRACTION = 0.618033988749895;

/**
 * Per-particle geometry for one frame, packed to `count`. Appearances read this; it carries no
 * colours, widths, or trail/arc specifics — only where each particle is and how it flows.
 */
export interface ParticleFrame {
  count: number;
  headLon: Float32Array;
  headLat: Float32Array;
  dirLon: Float32Array;
  dirLat: Float32Array;
  speed: Float32Array;
  age: Float32Array;
  span: Float32Array;
  footprint: Float32Array;
  headArc: Float32Array;
  /** Writes [lon, lat] of the point `arc` degrees along particle `index`'s streamline into `out`. */
  samplePath(index: number, arc: number, out: Float32Array): void;
}

/** Fills the segment scratch buffers from a frame and returns the number of segments written. */
export type ParticleAppearance = (
  frame: ParticleFrame,
  sources: Float32Array,
  targets: Float32Array,
  colors: Uint8Array,
) => number;

/**
 * A grid of cells over a vector field. Each cell precomputes the streamline through it; particles
 * ride that streamline from the upwind edge across the cell, are spaced apart, and recycle. The
 * simulation knows nothing about wind, waves, lines, or arcs — only motion over a vector field.
 */
export class ParticleSystem {
  readonly gridCols: number;
  readonly gridRows: number;
  readonly segmentSources: Float32Array;
  readonly segmentTargets: Float32Array;
  readonly segmentColors: Uint8Array;
  private headProgress: Float32Array;
  private active: Uint8Array;
  private cellCenterLon: Float32Array;
  private cellCenterLat: Float32Array;
  private cellHeightDegrees: Float32Array;
  private pathPoints: Float32Array;
  private pathLength: Float32Array;
  private crossDistance: Float32Array;
  private cellSpeed: Float32Array;
  private bounds: Bounds;
  private numCells: number;
  private cellWidthDegrees: number;
  private slotCount: number;
  private packedCell: Int32Array;
  private frameState: ParticleFrame;

  constructor(
    readonly vectorField: VectorField,
    gridCols: number,
    gridRows: number,
    private motion: ParticleMotion,
  ) {
    this.bounds = vectorField.bounds;
    const [west, south, east, north] = this.bounds;
    this.gridCols = Math.max(1, gridCols);
    this.gridRows = Math.max(1, gridRows);
    if (this.gridCols * this.gridRows > MAX_PARTICLE_GRID_CELLS) {
      this.gridRows = Math.max(1, Math.floor(MAX_PARTICLE_GRID_CELLS / this.gridCols));
    }
    this.numCells = this.gridCols * this.gridRows;
    this.cellWidthDegrees = (east - west) / this.gridCols;
    this.slotCount = this.numCells * MAX_SLOTS_PER_CELL;

    this.headProgress = new Float32Array(this.slotCount);
    this.active = new Uint8Array(this.slotCount);
    this.packedCell = new Int32Array(this.slotCount);
    this.cellCenterLon = new Float32Array(this.numCells);
    this.cellCenterLat = new Float32Array(this.numCells);
    this.cellHeightDegrees = new Float32Array(this.numCells);
    this.pathPoints = new Float32Array(this.numCells * PATH_POINTS * 2);
    this.pathLength = new Float32Array(this.numCells);
    this.crossDistance = new Float32Array(this.numCells);
    this.cellSpeed = new Float32Array(this.numCells);

    const segments = this.slotCount * MAX_SEGMENTS_PER_PARTICLE;
    this.segmentSources = new Float32Array(segments * 2);
    this.segmentTargets = new Float32Array(segments * 2);
    this.segmentColors = new Uint8Array(segments * 4);
    this.frameState = {
      count: 0,
      headLon: new Float32Array(this.slotCount),
      headLat: new Float32Array(this.slotCount),
      dirLon: new Float32Array(this.slotCount),
      dirLat: new Float32Array(this.slotCount),
      speed: new Float32Array(this.slotCount),
      age: new Float32Array(this.slotCount),
      span: new Float32Array(this.slotCount),
      footprint: new Float32Array(this.slotCount),
      headArc: new Float32Array(this.slotCount),
      samplePath: (index, arc, out) => this.samplePath(index, arc, out),
    };

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
    for (let i = 0; i < this.slotCount; i++) {
      if (!this.active[i]) continue;
      const cell = i % this.numCells;
      const crossing = this.crossDistance[cell];
      if (crossing <= 0) {
        this.active[i] = 0;
        continue;
      }
      const stepDegrees = this.motionSpeed(this.cellSpeed[cell]) * spanScale;
      this.headProgress[i] += Math.min(stepDegrees / crossing, maxIncrement);
      if (this.headProgress[i] >= 1) this.active[i] = 0;
    }
    for (let cell = 0; cell < this.numCells; cell++) {
      if (this.crossDistance[cell] <= 0) continue;
      const threshold = this.footprintFraction(this.cellSpeed[cell]) + GAP_CELL_FRACTION;
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

  frame(): ParticleFrame {
    const f = this.frameState;
    const head = headScratch;
    const back = backScratch;
    let p = 0;
    for (let i = 0; i < this.slotCount; i++) {
      if (!this.active[i]) continue;
      const cell = i % this.numCells;
      const crossing = this.crossDistance[cell];
      if (crossing <= 0) continue;
      const progress = this.headProgress[i];
      const headArc = progress * crossing;
      this.packedCell[p] = cell;
      this.samplePath(p, headArc, head);
      const behind = Math.max(0, headArc - Math.max(1e-4, crossing * 0.05));
      this.samplePath(p, behind, back);
      let dLon = head[0] - back[0];
      let dLat = head[1] - back[1];
      const length = Math.hypot(dLon, dLat) || 1;
      dLon /= length;
      dLat /= length;
      f.headLon[p] = head[0];
      f.headLat[p] = head[1];
      f.dirLon[p] = dLon;
      f.dirLat[p] = dLat;
      f.speed[p] = this.cellSpeed[cell];
      f.age[p] = progress;
      f.span[p] = crossing;
      f.footprint[p] = this.footprintFraction(this.cellSpeed[cell]) * crossing;
      f.headArc[p] = headArc;
      p++;
    }
    f.count = p;
    return f;
  }

  private samplePath(index: number, arc: number, out: Float32Array): void {
    const cell = this.packedCell[index];
    const length = this.pathLength[cell];
    const base = cell * PATH_POINTS * 2;
    const clamped = Math.max(0, Math.min(length, arc));
    const position = length > 0 ? (clamped / length) * (PATH_POINTS - 1) : 0;
    const point = Math.min(PATH_POINTS - 2, Math.floor(position));
    const fraction = position - point;
    const offset = base + point * 2;
    out[0] = this.pathPoints[offset] + (this.pathPoints[offset + 2] - this.pathPoints[offset]) * fraction;
    out[1] =
      this.pathPoints[offset + 1] + (this.pathPoints[offset + 3] - this.pathPoints[offset + 1]) * fraction;
  }

  private motionSpeed(speed: number): number {
    return Math.min(
      this.motion.maxSpeedMetersPerSecond,
      Math.max(speed, this.motion.minSpeedMetersPerSecond),
    );
  }

  private footprintFraction(speed: number): number {
    const norm = Math.min(1, speed / this.motion.footprintPivotMetersPerSecond);
    return (
      this.motion.minFootprintFraction +
      (this.motion.maxFootprintFraction - this.motion.minFootprintFraction) * norm
    );
  }

  private buildCellPath(cell: number): void {
    const centerLon = this.cellCenterLon[cell];
    const centerLat = this.cellCenterLat[cell];
    const halfWidth = this.cellWidthDegrees / 2;
    const halfHeight = this.cellHeightDegrees[cell] / 2;
    const base = cell * PATH_POINTS * 2;
    const [centerU, centerV] = sampleVectorField(this.vectorField, centerLon, centerLat);
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
      const [u, v] = sampleVectorField(this.vectorField, lon, lat);
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
      const [u, v] = sampleVectorField(this.vectorField, lon, lat);
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
}

const headScratch = new Float32Array(2);
const backScratch = new Float32Array(2);
