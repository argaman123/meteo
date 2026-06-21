import { FreeMotion } from '../../layers/look';
import { Grid } from '../../objects/grid';
import { ParticleSystem } from './particle-system';

const MINIMUM_LATITUDE_COSINE = 0.2;

export class FreeParticles extends ParticleSystem {
  private ages: Float32Array;
  private lifetimes: Float32Array;

  constructor(
    uField: Grid,
    vField: Grid,
    count: number,
    cellDegrees: number,
    private free: FreeMotion,
  ) {
    super(uField, vField, count, cellDegrees, free);
    this.ages = new Float32Array(this.count);
    this.lifetimes = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++) this.spawn(i);
    for (let i = 0; i < this.count; i++) this.ages[i] = Math.random() * this.lifetimes[i];
  }

  step(deltaSeconds: number, speedFactor: number): void {
    for (let i = 0; i < this.count; i++) {
      this.ages[i] += deltaSeconds;
      if (this.ages[i] >= this.lifetimes[i] || !this.advance(i, deltaSeconds, speedFactor)) {
        this.spawn(i);
        continue;
      }
      this.pushTrail(i);
      this.ageFraction[i] = Math.min(1, this.ages[i] / this.lifetimes[i]);
    }
  }

  private spawn(index: number): void {
    const [west, south, east, north] = this.bounds;
    let lon = 0;
    let lat = 0;
    let u = 0;
    let v = 0;
    let magnitude = 0;
    for (let attempt = 0; attempt < 6; attempt++) {
      lon = west + Math.random() * (east - west);
      lat = south + Math.random() * (north - south);
      u = this.uField.valueAt(lon, lat, 'nearest');
      v = this.vField.valueAt(lon, lat, 'nearest');
      magnitude = Math.hypot(u, v);
      if (!Number.isNaN(u) && magnitude > 0) break;
    }
    this.positionsLon[index] = lon;
    this.positionsLat[index] = lat;
    if (Number.isNaN(u) || magnitude === 0) {
      this.dirLon[index] = 0;
      this.dirLat[index] = 0;
      this.speeds[index] = 0;
    } else {
      this.dirLon[index] = u / magnitude;
      this.dirLat[index] = v / magnitude;
      this.speeds[index] = magnitude;
    }
    this.lifetimes[index] = this.free.lifetimeSeconds * (0.55 + 0.9 * Math.random());
    this.ages[index] = 0;
    this.ageFraction[index] = 0;
    this.collapseTrail(index);
  }

  private advance(index: number, deltaSeconds: number, speedFactor: number): boolean {
    const lon = this.positionsLon[index];
    const lat = this.positionsLat[index];
    let dirLon: number;
    let dirLat: number;
    let magnitude: number;
    if (this.free.straightLine) {
      dirLon = this.dirLon[index];
      dirLat = this.dirLat[index];
      magnitude = this.speeds[index];
    } else {
      const u = this.uField.valueAt(lon, lat, 'nearest');
      const v = this.vField.valueAt(lon, lat, 'nearest');
      magnitude = Math.hypot(u, v);
      if (Number.isNaN(u) || magnitude === 0) return false;
      dirLon = u / magnitude;
      dirLat = v / magnitude;
      this.dirLon[index] = dirLon;
      this.dirLat[index] = dirLat;
      this.speeds[index] = magnitude;
    }
    if (magnitude === 0) return false;
    const move = this.clampSpeed(magnitude) * this.moveScale(deltaSeconds, speedFactor);
    const cosLat = Math.max(MINIMUM_LATITUDE_COSINE, Math.cos((lat * Math.PI) / 180));
    const nextLon = lon + (dirLon * move) / cosLat;
    const nextLat = lat + dirLat * move;
    const [west, south, east, north] = this.bounds;
    if (nextLon < west || nextLon > east || nextLat < south || nextLat > north) return false;
    this.positionsLon[index] = nextLon;
    this.positionsLat[index] = nextLat;
    return true;
  }
}
