import { GridMotion } from '../../layers/look';
import { Grid } from '../../objects/grid';
import { inverseMercatorY, mercatorY } from './mercator';
import { MAX_PARTICLES, ParticleSystem } from './particle-system';

const MAX_SLOTS_PER_CELL = 3;
const MAX_GRID_CELLS = Math.floor(MAX_PARTICLES / MAX_SLOTS_PER_CELL);
const GAP_CELL_FRACTION = 0.35;
const MIN_TRAIL_CELL_FRACTION = 0.08;
const MAX_TRAIL_CELL_FRACTION = 0.85;
const ACROSS_LIMIT_CELL_FRACTION = 0.5;
const TRAIL_SPEED_PIVOT_METERS_PER_SECOND = 18;
const FADE_IN_FRACTION = 0.15;
const FADE_OUT_FRACTION = 0.35;
const FAST_DIMMING_PIVOT_METERS_PER_SECOND = 12;
const FAST_DIMMING_MINIMUM_ALPHA = 0.45;
const GOLDEN_RATIO_FRACTION = 0.618033988749895;

export class GridParticles extends ParticleSystem {
  private gridCols: number;
  private gridRows: number;
  private numCells: number;
  private cellWidthDegrees: number;
  private cellCenterLon: Float32Array;
  private cellCenterLat: Float32Array;
  private cellHeightDegrees: Float32Array;
  private emitAccumulators: Float32Array;
  private active: Uint8Array;
  private progress: Float32Array;
  private crossDistances: Float32Array;
  private rawSpeeds: Float32Array;
  private sampleDistances: Float32Array;
  private distanceSinceSample: Float32Array;
  private acrossOffsets: Float32Array;
  private startPoints: Float32Array;
  private emitDirections: Float32Array;

  constructor(uField: Grid, vField: Grid, gridCols: number, gridRows: number, grid: GridMotion) {
    const [west, , east] = uField.bounds;
    const cols = Math.max(1, gridCols);
    let rows = Math.max(1, gridRows);
    if (cols * rows > MAX_GRID_CELLS) rows = Math.max(1, Math.floor(MAX_GRID_CELLS / cols));
    const numCells = cols * rows;
    super(uField, vField, numCells * MAX_SLOTS_PER_CELL, (east - west) / cols, grid);
    this.gridCols = cols;
    this.gridRows = rows;
    this.numCells = numCells;
    this.cellWidthDegrees = (east - west) / cols;
    this.cellCenterLon = new Float32Array(numCells);
    this.cellCenterLat = new Float32Array(numCells);
    this.cellHeightDegrees = new Float32Array(numCells);
    this.emitAccumulators = new Float32Array(numCells);
    const n = this.count;
    this.active = new Uint8Array(n);
    this.progress = new Float32Array(n);
    this.crossDistances = new Float32Array(n);
    this.rawSpeeds = new Float32Array(n);
    this.sampleDistances = new Float32Array(n);
    this.distanceSinceSample = new Float32Array(n);
    this.acrossOffsets = new Float32Array(n);
    this.startPoints = new Float32Array(n * 2);
    this.emitDirections = new Float32Array(n * 2);
    this.buildCells();
    for (let cell = 0; cell < numCells; cell++) {
      this.emitFromCell(cell, cell, (cell * GOLDEN_RATIO_FRACTION) % 0.6);
    }
  }

  step(deltaSeconds: number, speedFactor: number): void {
    const spanScale = this.moveScale(deltaSeconds, speedFactor);
    const tp = this.trailPoints;
    for (let i = 0; i < this.count; i++) {
      if (!this.active[i]) continue;
      const headLon = this.trailLon[i * tp];
      const headLat = this.trailLat[i * tp];
      const u = this.uField.valueAt(headLon, headLat, 'nearest');
      const v = this.vField.valueAt(headLon, headLat, 'nearest');
      if (Number.isNaN(u)) {
        this.deactivate(i);
        continue;
      }
      const speed = Math.hypot(u, v);
      if (speed === 0) continue;
      this.rawSpeeds[i] = speed;
      this.speeds[i] = speed;
      const stepDegrees = this.clampSpeed(speed) * spanScale;
      const newLon = headLon + (u / speed) * stepDegrees;
      const newLat = headLat + (v / speed) * stepDegrees;
      this.trailLon[i * tp] = newLon;
      this.trailLat[i * tp] = newLat;
      this.positionsLon[i] = newLon;
      this.positionsLat[i] = newLat;
      this.dirLon[i] = u / speed;
      this.dirLat[i] = v / speed;
      const offsetLon = newLon - this.startPoints[i * 2];
      const offsetLat = newLat - this.startPoints[i * 2 + 1];
      const along =
        offsetLon * this.emitDirections[i * 2] + offsetLat * this.emitDirections[i * 2 + 1];
      const across = Math.abs(
        -offsetLon * this.emitDirections[i * 2 + 1] + offsetLat * this.emitDirections[i * 2],
      );
      this.progress[i] = along / this.crossDistances[i];
      this.acrossOffsets[i] = across;
      this.distanceSinceSample[i] += stepDegrees;
      if (this.distanceSinceSample[i] >= this.sampleDistances[i]) {
        for (let t = tp - 1; t > 0; t--) {
          this.trailLon[i * tp + t] = this.trailLon[i * tp + t - 1];
          this.trailLat[i * tp + t] = this.trailLat[i * tp + t - 1];
        }
        this.distanceSinceSample[i] -= this.sampleDistances[i];
      }
      const cell = i % this.numCells;
      const maxAcross =
        ACROSS_LIMIT_CELL_FRACTION * Math.min(this.cellWidthDegrees, this.cellHeightDegrees[cell]);
      if (this.progress[i] >= 1 || this.progress[i] < -0.1 || across >= maxAcross) {
        this.deactivate(i);
        continue;
      }
      this.ageFraction[i] = Math.max(0, Math.min(1, this.progress[i]));
      this.trailLengthDegrees[i] = this.trailLengthFor(speed, this.crossDistances[i]);
      this.headAlpha[i] = this.headAlphaFor(this.progress[i], speed, across, maxAcross);
    }
    this.emitFromCells(spanScale);
  }

  private emitFromCells(spanScale: number): void {
    for (let cell = 0; cell < this.numCells; cell++) {
      const u = this.uField.valueAt(this.cellCenterLon[cell], this.cellCenterLat[cell], 'nearest');
      const v = this.vField.valueAt(this.cellCenterLon[cell], this.cellCenterLat[cell], 'nearest');
      const speed = Math.hypot(u, v);
      if (Number.isNaN(u) || speed === 0) continue;
      const trailFraction =
        MIN_TRAIL_CELL_FRACTION +
        (MAX_TRAIL_CELL_FRACTION - MIN_TRAIL_CELL_FRACTION) *
          Math.min(1, speed / TRAIL_SPEED_PIVOT_METERS_PER_SECOND);
      const spacing = trailFraction + GAP_CELL_FRACTION;
      const cross = this.crossFor(u / speed, v / speed, this.cellHeightDegrees[cell]);
      this.emitAccumulators[cell] += (this.clampSpeed(speed) * spanScale) / cross;
      if (this.emitAccumulators[cell] >= spacing) {
        for (let s = 0; s < MAX_SLOTS_PER_CELL; s++) {
          const index = cell + s * this.numCells;
          if (!this.active[index]) {
            this.emitFromCell(index, cell, 0);
            break;
          }
        }
        this.emitAccumulators[cell] -= spacing;
      }
    }
  }

  private emitFromCell(index: number, cell: number, startProgress: number): void {
    const centerLon = this.cellCenterLon[cell];
    const centerLat = this.cellCenterLat[cell];
    const u = this.uField.valueAt(centerLon, centerLat, 'nearest');
    const v = this.vField.valueAt(centerLon, centerLat, 'nearest');
    const speed = Math.hypot(u, v);
    if (Number.isNaN(u) || speed === 0) {
      this.deactivate(index);
      return;
    }
    const dirLon = u / speed;
    const dirLat = v / speed;
    const cross = this.crossFor(dirLon, dirLat, this.cellHeightDegrees[cell]);
    const crossHalf = cross / 2;
    const startLon = centerLon - dirLon * crossHalf;
    const startLat = centerLat - dirLat * crossHalf;
    const headLon = startLon + dirLon * startProgress * cross;
    const headLat = startLat + dirLat * startProgress * cross;
    const tp = this.trailPoints;
    this.active[index] = 1;
    this.crossDistances[index] = cross;
    this.rawSpeeds[index] = speed;
    this.speeds[index] = speed;
    this.progress[index] = startProgress;
    this.sampleDistances[index] = (MAX_TRAIL_CELL_FRACTION * cross) / (tp - 1);
    this.distanceSinceSample[index] = 0;
    this.acrossOffsets[index] = 0;
    this.startPoints[index * 2] = startLon;
    this.startPoints[index * 2 + 1] = startLat;
    this.emitDirections[index * 2] = dirLon;
    this.emitDirections[index * 2 + 1] = dirLat;
    this.positionsLon[index] = headLon;
    this.positionsLat[index] = headLat;
    this.dirLon[index] = dirLon;
    this.dirLat[index] = dirLat;
    for (let t = 0; t < tp; t++) {
      this.trailLon[index * tp + t] = headLon;
      this.trailLat[index * tp + t] = headLat;
    }
    const maxAcross =
      ACROSS_LIMIT_CELL_FRACTION * Math.min(this.cellWidthDegrees, this.cellHeightDegrees[cell]);
    this.ageFraction[index] = Math.max(0, startProgress);
    this.trailLengthDegrees[index] = this.trailLengthFor(speed, cross);
    this.headAlpha[index] = this.headAlphaFor(startProgress, speed, 0, maxAcross);
  }

  private deactivate(index: number): void {
    this.active[index] = 0;
    this.speeds[index] = 0;
    this.headAlpha[index] = 0;
  }

  private trailLengthFor(rawSpeed: number, cross: number): number {
    const trailFraction =
      MIN_TRAIL_CELL_FRACTION +
      (MAX_TRAIL_CELL_FRACTION - MIN_TRAIL_CELL_FRACTION) *
        Math.min(1, rawSpeed / TRAIL_SPEED_PIVOT_METERS_PER_SECOND);
    return trailFraction * cross;
  }

  private headAlphaFor(
    progress: number,
    rawSpeed: number,
    acrossOffset: number,
    maxAcross: number,
  ): number {
    const fastDim = Math.max(
      FAST_DIMMING_MINIMUM_ALPHA,
      Math.min(1, FAST_DIMMING_PIVOT_METERS_PER_SECOND / Math.max(0.001, rawSpeed)),
    );
    const acrossRemaining = (maxAcross - acrossOffset) / maxAcross;
    const birthFade = Math.max(0, Math.min(1, progress / FADE_IN_FRACTION));
    const deathFade = Math.min(
      Math.max(0, (1 - progress) / FADE_OUT_FRACTION),
      Math.max(0, acrossRemaining / FADE_OUT_FRACTION),
    );
    return birthFade * Math.min(1, deathFade) * fastDim;
  }

  private crossFor(dirLon: number, dirLat: number, cellHeightDegrees: number): number {
    const toVerticalEdge =
      Math.abs(dirLon) > 1e-6 ? this.cellWidthDegrees / 2 / Math.abs(dirLon) : Infinity;
    const toHorizontalEdge =
      Math.abs(dirLat) > 1e-6 ? cellHeightDegrees / 2 / Math.abs(dirLat) : Infinity;
    return 2 * Math.min(toVerticalEdge, toHorizontalEdge);
  }

  private buildCells(): void {
    const [west, south, east, north] = this.bounds;
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
        this.emitAccumulators[cell] = (cell * GOLDEN_RATIO_FRACTION) % 1;
      }
    }
  }
}
