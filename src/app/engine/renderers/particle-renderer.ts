import type { Layer } from '@deck.gl/core';
import { LineLayer } from '@deck.gl/layers';
import { ParticleLayerDefinition } from '../../layers/layer-definition';
import { Bounds, VectorField } from '../../types/field-grid';
import { sampleVectorField } from '../../utils/grids';

const TRAIL_POINTS = 8;
const MAX_AGE_SECONDS = 8;
const DEGREES_PER_METER_PER_SECOND = 0.0015;
const MIN_LATITUDE_COSINE = 0.2;

export class ParticleSystem {
  private history: Float32Array;
  private ages: Float32Array;
  private sources: Float32Array;
  private targets: Float32Array;
  private colors: Uint8Array;
  private spawnBounds: Bounds;

  constructor(
    readonly wind: VectorField,
    readonly count: number,
    initialBounds: Bounds,
  ) {
    this.history = new Float32Array(TRAIL_POINTS * count * 2);
    this.ages = new Float32Array(count);
    const segments = count * (TRAIL_POINTS - 1);
    this.sources = new Float32Array(segments * 2);
    this.targets = new Float32Array(segments * 2);
    this.colors = new Uint8Array(segments * 4);
    this.spawnBounds = initialBounds;
    for (let i = 0; i < count; i++) this.respawn(i, Math.random() * MAX_AGE_SECONDS);
    for (let i = 0; i < segments; i++) {
      const trailIndex = i % (TRAIL_POINTS - 1);
      const alpha = Math.round(255 * (1 - trailIndex / (TRAIL_POINTS - 1)));
      this.colors[i * 4] = 255;
      this.colors[i * 4 + 1] = 255;
      this.colors[i * 4 + 2] = 255;
      this.colors[i * 4 + 3] = alpha;
    }
  }

  setSpawnBounds(bounds: Bounds): void {
    this.spawnBounds = bounds;
  }

  step(deltaSeconds: number): void {
    const stride = this.count * 2;
    this.history.copyWithin(stride, 0, stride * (TRAIL_POINTS - 1));
    for (let i = 0; i < this.count; i++) {
      const lon = this.history[stride + i * 2];
      const lat = this.history[stride + i * 2 + 1];
      const [u, v] = sampleVectorField(this.wind, lon, lat);
      this.ages[i] += deltaSeconds;
      if (Number.isNaN(u) || this.ages[i] > MAX_AGE_SECONDS || this.outsideSpawnArea(lon, lat)) {
        this.respawn(i, 0);
        continue;
      }
      const latitudeCosine = Math.max(MIN_LATITUDE_COSINE, Math.cos((lat * Math.PI) / 180));
      const speedScale = DEGREES_PER_METER_PER_SECOND * deltaSeconds * 60;
      this.history[i * 2] = lon + (u * speedScale) / latitudeCosine;
      this.history[i * 2 + 1] = lat + v * speedScale;
    }
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
      for (let t = 0; t < TRAIL_POINTS - 1; t++) {
        this.sources[segment * 2] = this.history[t * stride + i * 2];
        this.sources[segment * 2 + 1] = this.history[t * stride + i * 2 + 1];
        this.targets[segment * 2] = this.history[(t + 1) * stride + i * 2];
        this.targets[segment * 2 + 1] = this.history[(t + 1) * stride + i * 2 + 1];
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

  private outsideSpawnArea(lon: number, lat: number): boolean {
    const [west, south, east, north] = this.spawnBounds;
    const lonMargin = (east - west) * 0.1;
    const latMargin = (north - south) * 0.1;
    return (
      lon < west - lonMargin ||
      lon > east + lonMargin ||
      lat < south - latMargin ||
      lat > north + latMargin
    );
  }

  private respawn(index: number, age: number): void {
    const [west, south, east, north] = this.spawnBounds;
    let lon = 0;
    let lat = 0;
    for (let attempt = 0; attempt < 8; attempt++) {
      lon = west + Math.random() * (east - west);
      lat = south + Math.random() * (north - south);
      const [u] = sampleVectorField(this.wind, lon, lat);
      if (!Number.isNaN(u)) break;
    }
    this.ages[index] = age;
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
    getWidth: 1.5,
    widthUnits: 'pixels',
    opacity: definition.opacity,
  });
}
