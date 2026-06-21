import { CommonMotion } from '../../layers/look';
import { Bounds } from '../../types/wrap';
import { Grid } from '../../objects/grid';

export const MAX_PARTICLES = 12000;
const GLYPH_SEGMENT_BUDGET = 8;

export interface ParticleFrame {
  count: number;
  trailPoints: number;
  cellDegrees: number;
  headLon: Float32Array;
  headLat: Float32Array;
  dirLon: Float32Array;
  dirLat: Float32Array;
  speed: Float32Array;
  ageFraction: Float32Array;
  headAlpha: Float32Array;
  trailLengthDegrees: Float32Array;
  trailLon: Float32Array;
  trailLat: Float32Array;
}

export type ParticleAppearance = (
  frame: ParticleFrame,
  sources: Float32Array,
  targets: Float32Array,
  colors: Uint8Array,
  sizeScale: number,
) => number;

export abstract class ParticleSystem {
  readonly count: number;
  readonly segmentSources: Float32Array;
  readonly segmentTargets: Float32Array;
  readonly segmentColors: Uint8Array;
  protected bounds: Bounds;
  protected dataSpan: number;
  protected trailPoints: number;
  protected positionsLon: Float32Array;
  protected positionsLat: Float32Array;
  protected dirLon: Float32Array;
  protected dirLat: Float32Array;
  protected speeds: Float32Array;
  protected ageFraction: Float32Array;
  protected headAlpha: Float32Array;
  protected trailLengthDegrees: Float32Array;
  protected trailLon: Float32Array;
  protected trailLat: Float32Array;
  private frameState: ParticleFrame;

  constructor(
    readonly uField: Grid,
    readonly vField: Grid,
    count: number,
    cellDegrees: number,
    protected motion: CommonMotion,
  ) {
    this.bounds = uField.bounds;
    this.dataSpan = this.bounds[2] - this.bounds[0];
    this.count = Math.max(1, Math.min(MAX_PARTICLES, count));
    this.trailPoints = Math.max(2, Math.round(motion.trailPoints));
    const n = this.count;
    const tp = this.trailPoints;
    this.positionsLon = new Float32Array(n);
    this.positionsLat = new Float32Array(n);
    this.dirLon = new Float32Array(n);
    this.dirLat = new Float32Array(n);
    this.speeds = new Float32Array(n);
    this.ageFraction = new Float32Array(n);
    this.headAlpha = new Float32Array(n).fill(1);
    this.trailLengthDegrees = new Float32Array(n).fill(Number.MAX_VALUE);
    this.trailLon = new Float32Array(n * tp);
    this.trailLat = new Float32Array(n * tp);
    const segments = n * Math.max(tp - 1, GLYPH_SEGMENT_BUDGET);
    this.segmentSources = new Float32Array(segments * 2);
    this.segmentTargets = new Float32Array(segments * 2);
    this.segmentColors = new Uint8Array(segments * 4);
    this.frameState = {
      count: 0,
      trailPoints: tp,
      cellDegrees,
      headLon: new Float32Array(n),
      headLat: new Float32Array(n),
      dirLon: new Float32Array(n),
      dirLat: new Float32Array(n),
      speed: new Float32Array(n),
      ageFraction: new Float32Array(n),
      headAlpha: new Float32Array(n),
      trailLengthDegrees: new Float32Array(n),
      trailLon: new Float32Array(n * tp),
      trailLat: new Float32Array(n * tp),
    };
  }

  abstract step(deltaSeconds: number, speedFactor: number): void;

  frame(): ParticleFrame {
    const f = this.frameState;
    const tp = this.trailPoints;
    let p = 0;
    for (let i = 0; i < this.count; i++) {
      if (this.speeds[i] === 0) continue;
      f.headLon[p] = this.positionsLon[i];
      f.headLat[p] = this.positionsLat[i];
      f.dirLon[p] = this.dirLon[i];
      f.dirLat[p] = this.dirLat[i];
      f.speed[p] = this.speeds[i];
      f.ageFraction[p] = this.ageFraction[i];
      f.headAlpha[p] = this.headAlpha[i];
      f.trailLengthDegrees[p] = this.trailLengthDegrees[i];
      for (let t = 0; t < tp; t++) {
        f.trailLon[p * tp + t] = this.trailLon[i * tp + t];
        f.trailLat[p * tp + t] = this.trailLat[i * tp + t];
      }
      p++;
    }
    f.count = p;
    return f;
  }

  protected moveScale(deltaSeconds: number, speedFactor: number): number {
    return this.motion.speedScale * this.dataSpan * speedFactor * deltaSeconds;
  }

  protected clampSpeed(magnitude: number): number {
    return Math.min(
      this.motion.maxSpeedMetersPerSecond,
      Math.max(magnitude, this.motion.minSpeedMetersPerSecond),
    );
  }

  protected pushTrail(index: number): void {
    const tp = this.trailPoints;
    for (let t = tp - 1; t > 0; t--) {
      this.trailLon[index * tp + t] = this.trailLon[index * tp + t - 1];
      this.trailLat[index * tp + t] = this.trailLat[index * tp + t - 1];
    }
    this.trailLon[index * tp] = this.positionsLon[index];
    this.trailLat[index * tp] = this.positionsLat[index];
  }

  protected collapseTrail(index: number): void {
    const tp = this.trailPoints;
    const lon = this.positionsLon[index];
    const lat = this.positionsLat[index];
    for (let t = 0; t < tp; t++) {
      this.trailLon[index * tp + t] = lon;
      this.trailLat[index * tp + t] = lat;
    }
  }
}
