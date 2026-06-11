import type { Layer } from '@deck.gl/core';
import { LineLayer } from '@deck.gl/layers';
import { ParticleLayerDefinition } from '../../layers/layer-definition';
import { ParticleTuning } from '../../settings/particle-settings';
import { Bounds, VectorField } from '../../types/field-grid';
import { sampleVectorField } from '../../utils/grids';

const TRAIL_POINTS = 8;
const TRAIL_SAMPLE_SECONDS = 0.05;
const MIN_LIFETIME_SECONDS = 0.8;
const MAX_LIFETIME_SECONDS = 1.6;
const FADE_SECONDS = 0.25;
const SPAN_FRACTION_PER_SECOND_PER_METER_PER_SECOND = 0.0018;
const FIXED_REFERENCE_SPAN_DEGREES = 40;
const SQRT_CURVE_PIVOT_METERS_PER_SECOND = 10;
const FLOOR_CURVE_MINIMUM_METERS_PER_SECOND = 3;
const MIN_LATITUDE_COSINE = 0.2;
const VIEW_MARGIN_FRACTION = 0.02;
const REDISTRIBUTE_SPAN_RATIO = 1.2;
const REDISTRIBUTE_CENTER_SHIFT_FRACTION = 0.2;
const REDISTRIBUTE_FRACTION = 0.25;

export class ParticleSystem {
  private history: Float32Array;
  private ages: Float32Array;
  private lifetimes: Float32Array;
  private sources: Float32Array;
  private targets: Float32Array;
  private colors: Uint8Array;
  private trailAlphas: Float32Array;
  private spawnBounds: Bounds;
  private seedBounds: Bounds;
  private sinceTrailSample = 0;
  private lifetimeScale = 1;

  constructor(
    readonly wind: VectorField,
    readonly count: number,
    initialBounds: Bounds,
  ) {
    this.history = new Float32Array(TRAIL_POINTS * count * 2);
    this.ages = new Float32Array(count);
    this.lifetimes = new Float32Array(count);
    const segments = count * (TRAIL_POINTS - 1);
    this.sources = new Float32Array(segments * 2);
    this.targets = new Float32Array(segments * 2);
    this.colors = new Uint8Array(segments * 4);
    this.trailAlphas = new Float32Array(TRAIL_POINTS - 1);
    for (let t = 0; t < TRAIL_POINTS - 1; t++) {
      this.trailAlphas[t] = 1 - t / (TRAIL_POINTS - 1);
    }
    for (let i = 0; i < segments * 4; i += 4) {
      this.colors[i] = 255;
      this.colors[i + 1] = 255;
      this.colors[i + 2] = 255;
    }
    this.spawnBounds = initialBounds;
    this.seedBounds = initialBounds;
    for (let i = 0; i < count; i++) this.respawn(i, Math.random());
  }

  setSpawnBounds(bounds: Bounds): void {
    this.spawnBounds = bounds;
    const seedSpan = this.seedBounds[2] - this.seedBounds[0];
    const span = bounds[2] - bounds[0];
    const ratio = span / seedSpan;
    const shiftLimit = Math.max(span, seedSpan) * REDISTRIBUTE_CENTER_SHIFT_FRACTION;
    const centerShiftLon = Math.abs(
      (bounds[0] + bounds[2]) / 2 - (this.seedBounds[0] + this.seedBounds[2]) / 2,
    );
    const centerShiftLat = Math.abs(
      (bounds[1] + bounds[3]) / 2 - (this.seedBounds[1] + this.seedBounds[3]) / 2,
    );
    if (
      ratio > REDISTRIBUTE_SPAN_RATIO ||
      ratio < 1 / REDISTRIBUTE_SPAN_RATIO ||
      centerShiftLon > shiftLimit ||
      centerShiftLat > shiftLimit
    ) {
      for (let i = 0; i < this.count; i++) {
        if (Math.random() < REDISTRIBUTE_FRACTION) this.respawn(i, Math.random() * 0.5);
      }
      this.seedBounds = bounds;
    }
  }

  step(deltaSeconds: number, tuning: ParticleTuning): void {
    this.lifetimeScale = tuning.lifetimeScale;
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
      this.ages[i] += deltaSeconds;
      if (Number.isNaN(u) || this.ages[i] > this.lifetimes[i] || this.outsideView(lon, lat)) {
        this.respawn(i, 0);
        continue;
      }
      const speed = Math.hypot(u, v);
      if (speed === 0) continue;
      const curvedSpeed =
        tuning.speedCurve === 'sqrt'
          ? Math.sqrt(speed * SQRT_CURVE_PIVOT_METERS_PER_SECOND)
          : tuning.speedCurve === 'floor'
            ? Math.max(speed, FLOOR_CURVE_MINIMUM_METERS_PER_SECOND)
            : speed;
      const stepDegrees = curvedSpeed * spanScale;
      const latitudeCosine = tuning.latitudeCorrection
        ? Math.max(MIN_LATITUDE_COSINE, Math.cos((lat * Math.PI) / 180))
        : 1;
      this.history[i * 2] = lon + ((u / speed) * stepDegrees) / latitudeCosine;
      this.history[i * 2 + 1] = lat + (v / speed) * stepDegrees;
    }
  }

  private referenceSpan(reference: ParticleTuning['speedReference']): number {
    if (reference === 'fixed') return FIXED_REFERENCE_SPAN_DEGREES;
    if (reference === 'data') return this.wind.bounds[2] - this.wind.bounds[0];
    return this.spawnBounds[2] - this.spawnBounds[0];
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
      const age = this.ages[i];
      const lifetime = this.lifetimes[i];
      const fade = Math.max(0, Math.min(1, age / FADE_SECONDS, (lifetime - age) / FADE_SECONDS));
      for (let t = 0; t < TRAIL_POINTS - 1; t++) {
        this.sources[segment * 2] = this.history[t * stride + i * 2];
        this.sources[segment * 2 + 1] = this.history[t * stride + i * 2 + 1];
        this.targets[segment * 2] = this.history[(t + 1) * stride + i * 2];
        this.targets[segment * 2 + 1] = this.history[(t + 1) * stride + i * 2 + 1];
        this.colors[segment * 4 + 3] = Math.round(255 * this.trailAlphas[t] * fade);
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

  private outsideView(lon: number, lat: number): boolean {
    const [west, south, east, north] = this.spawnBounds;
    const lonMargin = (east - west) * VIEW_MARGIN_FRACTION;
    const latMargin = (north - south) * VIEW_MARGIN_FRACTION;
    return (
      lon < west - lonMargin ||
      lon > east + lonMargin ||
      lat < south - latMargin ||
      lat > north + latMargin
    );
  }

  private respawn(index: number, ageFraction: number): void {
    const [west, south, east, north] = this.spawnBounds;
    let lon = 0;
    let lat = 0;
    for (let attempt = 0; attempt < 8; attempt++) {
      lon = west + Math.random() * (east - west);
      lat = south + Math.random() * (north - south);
      const [u] = sampleVectorField(this.wind, lon, lat);
      if (!Number.isNaN(u)) break;
    }
    const lifetime =
      (MIN_LIFETIME_SECONDS + Math.random() * (MAX_LIFETIME_SECONDS - MIN_LIFETIME_SECONDS)) *
      this.lifetimeScale;
    this.lifetimes[index] = lifetime;
    this.ages[index] = ageFraction * lifetime;
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
    getWidth: 1,
    widthUnits: 'pixels',
    opacity: definition.opacity,
  });
}
