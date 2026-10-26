import { Grid, VectorField } from '../../objects/grid';
import { Bounds } from '../../types/wrap';
import { Control, options } from '../../utils/controls';
import { contains } from '../../utils/geo';
import { inkColor } from '../map-service';
import { Look, LookKind } from '../base/look';
import { Overlay, TrailOverlay } from '../base/overlay';

const COUNT = 2000;
const DECAY = 0.94;
const LINE_WIDTH = 2.5;

export class WindParticles extends Look<VectorField> {
  readonly kind = LookKind.Particles;
  readonly speed = options<number>(1, [
    { value: 0.5, label: '×0.5' },
    { value: 1, label: '×1' },
    { value: 2, label: '×2' },
  ]);
  override readonly controls: Control[] = [this.speed];

  private last?: { field: VectorField; sim: ParticleSim } = undefined;

  override release(): void {
    this.last = undefined;
  }

  buildLook(field: VectorField): Overlay[] {
    if (this.last?.field !== field) this.last = { field, sim: new ParticleSim(field.u, field.v) };
    const { sim } = this.last;
    return [
      new TrailOverlay(field.u.bounds, inkColor(), LINE_WIDTH, DECAY, 0.85, (deltaSeconds) => {
        sim.advance(deltaSeconds * this.speed());
        return sim.segments;
      }),
    ];
  }
}

class ParticleSim {
  readonly segments = new Float32Array(COUNT * 4);
  private readonly bounds: Bounds;
  private readonly lonSpan: number;
  private readonly cols = 40;
  private readonly rows: number;
  private cell = 0;
  private readonly headLon = new Float32Array(COUNT);
  private readonly headLat = new Float32Array(COUNT);
  private readonly age = new Float32Array(COUNT);
  private readonly life = new Float32Array(COUNT);

  constructor(
    private readonly u: Grid,
    private readonly v: Grid,
  ) {
    this.bounds = u.bounds;
    const [west, south, east, north] = u.bounds;
    this.lonSpan = east - west;
    this.rows = Math.max(1, Math.round((this.cols * (north - south)) / this.lonSpan));
    for (let i = 0; i < COUNT; i++) {
      this.spawn(i);
      this.age[i] = Math.random() * this.life[i];
    }
  }

  advance(deltaSeconds: number): void {
    const move = 0.004 * this.lonSpan * deltaSeconds;
    for (let i = 0; i < COUNT; i++) {
      this.age[i] += deltaSeconds;
      const headLon = this.headLon[i];
      const headLat = this.headLat[i];
      const u = this.u.valueAt(headLon, headLat, 'nearest');
      const v = this.v.valueAt(headLon, headLat, 'nearest');
      const speed = Math.hypot(u, v);
      if (Number.isNaN(u) || speed === 0 || this.age[i] >= this.life[i]) {
        this.respawn(i);
        continue;
      }
      const step = Math.min(13, 3.5 * Math.pow(speed, 0.3)) * move;
      const nextLon = headLon + (u / speed) * step;
      const nextLat = headLat + (v / speed) * step;
      if (!contains(this.bounds, nextLon, nextLat)) {
        this.respawn(i);
        continue;
      }
      this.writeSegment(i, headLon, headLat, nextLon, nextLat);
      this.headLon[i] = nextLon;
      this.headLat[i] = nextLat;
    }
  }

  private respawn(i: number): void {
    this.spawn(i);
    this.writeSegment(i, this.headLon[i], this.headLat[i], this.headLon[i], this.headLat[i]);
  }

  private writeSegment(i: number, fromLon: number, fromLat: number, toLon: number, toLat: number): void {
    this.segments[i * 4] = fromLon;
    this.segments[i * 4 + 1] = fromLat;
    this.segments[i * 4 + 2] = toLon;
    this.segments[i * 4 + 3] = toLat;
  }

  private spawn(i: number): void {
    const PRIME_STRIDE = 7919;
    const [west, south, , north] = this.bounds;
    this.cell = (this.cell + PRIME_STRIDE) % (this.cols * this.rows);
    this.headLon[i] = west + (((this.cell % this.cols) + Math.random()) / this.cols) * this.lonSpan;
    this.headLat[i] =
      north - ((Math.floor(this.cell / this.cols) + Math.random()) / this.rows) * (north - south);
    this.age[i] = 0;
    this.life[i] = 1.5 + Math.random() * 2;
  }
}
