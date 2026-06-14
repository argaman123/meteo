import type { Layer } from '@deck.gl/core';
import { LineLayer } from '@deck.gl/layers';
import { ParticleLayerDefinition } from '../../layers/layer-definition';
import { ParticleTuning } from '../../settings/particle-settings';
import { Bounds, VectorField } from '../../types/field-grid';
import { sampleVectorField } from '../../utils/grids';

const TRAIL_POINTS = 13;
const TRAIL_SAMPLE_SECONDS = 0.05;
const TRAIL_FADE_POWER = 1.6;
const EVEN_LIFETIME_SECONDS = 1.4;
const RANDOM_MIN_LIFETIME_SECONDS = 1.6;
const RANDOM_MAX_LIFETIME_SECONDS = 3.2;
const FADE_SECONDS = 0.25;
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
const SLOW_SPAWN_BIAS_METERS_PER_SECOND = 8;
const SPAWN_JITTER_FRACTION = 0.45;
const GOLDEN_RATIO_FRACTION = 0.618033988749895;
const DEATH_RECESSION_BAND = 0.5;
const MIN_LATITUDE_COSINE = 0.2;
const COVERAGE_MARGIN_FRACTION = 0.02;

export class ParticleSystem {
  private history: Float32Array;
  private ages: Float32Array;
  private lifetimes: Float32Array;
  private speedAlphas: Float32Array;
  private homeU: Float32Array;
  private homeV: Float32Array;
  private sources: Float32Array;
  private targets: Float32Array;
  private colors: Uint8Array;
  private trailAlphas: Float32Array;
  private bounds: Bounds;
  private gridCols: number;
  private gridRows: number;
  private spawnMode: ParticleTuning['spawnMode'] = 'even';
  private sinceTrailSample = 0;
  private lifetimeScale = 1;

  constructor(
    readonly wind: VectorField,
    readonly count: number,
  ) {
    this.history = new Float32Array(TRAIL_POINTS * count * 2);
    this.ages = new Float32Array(count);
    this.lifetimes = new Float32Array(count);
    this.speedAlphas = new Float32Array(count).fill(1);
    this.homeU = new Float32Array(count);
    this.homeV = new Float32Array(count);
    const segments = count * (TRAIL_POINTS - 1);
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
    this.bounds = wind.bounds;
    const [west, south, east, north] = this.bounds;
    const aspect = (east - west) / Math.max(1e-6, north - south);
    this.gridCols = Math.max(1, Math.round(Math.sqrt(count * aspect)));
    this.gridRows = Math.max(1, Math.round(count / this.gridCols));
    const totalCells = this.gridCols * this.gridRows;
    for (let i = 0; i < count; i++) {
      const cellIndex = Math.floor((i * totalCells) / count);
      const col = cellIndex % this.gridCols;
      const row = Math.floor(cellIndex / this.gridCols);
      this.homeU[i] = (col + 0.5) / this.gridCols;
      this.homeV[i] = (row + 0.5) / this.gridRows;
    }
    this.seedEven();
  }

  step(deltaSeconds: number, tuning: ParticleTuning): void {
    this.lifetimeScale = tuning.lifetimeScale;
    if (tuning.spawnMode !== this.spawnMode) {
      this.spawnMode = tuning.spawnMode;
      if (this.spawnMode === 'even') this.seedEven();
    }
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
      if (Number.isNaN(u) || this.ages[i] > this.lifetimes[i] || this.outsideCoverage(lon, lat)) {
        this.respawn(i, 0);
        continue;
      }
      const speed = Math.hypot(u, v);
      if (speed === 0) continue;
      this.speedAlphas[i] = Math.max(
        FAST_DIMMING_MINIMUM_ALPHA,
        Math.min(1, FAST_DIMMING_PIVOT_METERS_PER_SECOND / speed),
      );
      const curvedSpeed = curveSpeed(speed, tuning.speedCurve);
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
    for (let i = 0; i < this.count; i++) {
      const age = this.ages[i];
      const lifetime = this.lifetimes[i];
      const birthFade = Math.min(1, age / FADE_SECONDS) * this.speedAlphas[i];
      const deathWindow = Math.max(0, (age - (lifetime - FADE_SECONDS)) / FADE_SECONDS);
      const recessionFront =
        1 + DEATH_RECESSION_BAND / 2 - deathWindow * (1 + DEATH_RECESSION_BAND);
      for (let t = 0; t < segmentsPerParticle; t++) {
        this.sources[segment * 2] = this.history[t * stride + i * 2];
        this.sources[segment * 2 + 1] = this.history[t * stride + i * 2 + 1];
        this.targets[segment * 2] = this.history[(t + 1) * stride + i * 2];
        this.targets[segment * 2 + 1] = this.history[(t + 1) * stride + i * 2 + 1];
        const trailPosition = t / (segmentsPerParticle - 1);
        const deathErase = Math.max(
          0,
          Math.min(1, (recessionFront - trailPosition) / DEATH_RECESSION_BAND + 0.5),
        );
        this.colors[segment * 4 + 3] = Math.round(
          255 * this.trailAlphas[t] * birthFade * deathErase,
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

  private outsideCoverage(lon: number, lat: number): boolean {
    const [west, south, east, north] = this.bounds;
    const lonMargin = (east - west) * COVERAGE_MARGIN_FRACTION;
    const latMargin = (north - south) * COVERAGE_MARGIN_FRACTION;
    return (
      lon < west - lonMargin ||
      lon > east + lonMargin ||
      lat < south - latMargin ||
      lat > north + latMargin
    );
  }

  private seedEven(): void {
    for (let i = 0; i < this.count; i++) {
      this.placeAtHome(i, (i * GOLDEN_RATIO_FRACTION) % 1);
    }
  }

  private respawn(index: number, ageFraction: number): void {
    if (this.spawnMode === 'even') this.placeAtHome(index, ageFraction);
    else this.respawnRandom(index, ageFraction);
  }

  private placeAtHome(index: number, ageFraction: number): void {
    const [west, south, east, north] = this.bounds;
    const cellWidth = (east - west) / this.gridCols;
    const cellHeight = (north - south) / this.gridRows;
    const lon =
      west +
      this.homeU[index] * (east - west) +
      (Math.random() - 0.5) * SPAWN_JITTER_FRACTION * cellWidth;
    const lat =
      south +
      this.homeV[index] * (north - south) +
      (Math.random() - 0.5) * SPAWN_JITTER_FRACTION * cellHeight;
    this.placeParticle(index, lon, lat, EVEN_LIFETIME_SECONDS * this.lifetimeScale, ageFraction);
  }

  private respawnRandom(index: number, ageFraction: number): void {
    const [west, south, east, north] = this.bounds;
    let lon = west + Math.random() * (east - west);
    let lat = south + Math.random() * (north - south);
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidateLon = west + Math.random() * (east - west);
      const candidateLat = south + Math.random() * (north - south);
      const [u, v] = sampleVectorField(this.wind, candidateLon, candidateLat);
      if (Number.isNaN(u)) continue;
      lon = candidateLon;
      lat = candidateLat;
      const speed = Math.hypot(u, v);
      const acceptProbability =
        SLOW_SPAWN_BIAS_METERS_PER_SECOND / (SLOW_SPAWN_BIAS_METERS_PER_SECOND + speed);
      if (Math.random() < acceptProbability) break;
    }
    const lifetime =
      RANDOM_MIN_LIFETIME_SECONDS +
      Math.random() * (RANDOM_MAX_LIFETIME_SECONDS - RANDOM_MIN_LIFETIME_SECONDS);
    this.placeParticle(index, lon, lat, lifetime * this.lifetimeScale, ageFraction);
  }

  private placeParticle(
    index: number,
    lon: number,
    lat: number,
    lifetime: number,
    ageFraction: number,
  ): void {
    this.lifetimes[index] = lifetime;
    this.ages[index] = ageFraction * lifetime;
    for (let t = 0; t < TRAIL_POINTS; t++) {
      this.history[t * this.count * 2 + index * 2] = lon;
      this.history[t * this.count * 2 + index * 2 + 1] = lat;
    }
  }
}

export function particleLineWidth(): number {
  return BASE_LINE_WIDTH_PIXELS;
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
