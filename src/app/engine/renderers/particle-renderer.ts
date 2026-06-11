import type { Layer } from '@deck.gl/core';
import { LineLayer } from '@deck.gl/layers';
import { ParticleLayerDefinition } from '../../layers/layer-definition';
import { Bounds, VectorField } from '../../types/field-grid';

const DASH_BASE_LENGTH_PIXELS = 5;
const DASH_LENGTH_PIXELS_PER_METER_PER_SECOND = 0.35;
const DASH_MAX_LENGTH_PIXELS = 16;
const TRAVEL_DISTANCE_PIXELS = 16;
const CRAWL_PIXELS_PER_SECOND_PER_METER_PER_SECOND = 0.6;
const MAX_CRAWL_PIXELS_PER_SECOND = 16;
const PHASE_FADE_FRACTION = 0.25;
const MIN_LATITUDE_COSINE = 0.2;

export class WindDashField {
  private nodeCount = 0;
  private nodeLon: Float32Array;
  private nodeLat: Float32Array;
  private nodeU: Float32Array;
  private nodeV: Float32Array;
  private nodeSpeed: Float32Array;
  private nodePhaseOffset: Float32Array;
  private sources: Float32Array;
  private targets: Float32Array;
  private colors: Uint8Array;

  constructor(
    readonly wind: VectorField,
    readonly maxDashCount: number,
  ) {
    const totalNodes = wind.width * wind.height;
    const stride = Math.max(1, Math.ceil(Math.sqrt(totalNodes / maxDashCount)));
    const capacity = Math.ceil(wind.width / stride) * Math.ceil(wind.height / stride);
    this.nodeLon = new Float32Array(capacity);
    this.nodeLat = new Float32Array(capacity);
    this.nodeU = new Float32Array(capacity);
    this.nodeV = new Float32Array(capacity);
    this.nodeSpeed = new Float32Array(capacity);
    this.nodePhaseOffset = new Float32Array(capacity);
    const [west, south, east, north] = wind.bounds;
    for (let r = 0; r < wind.height; r += stride) {
      for (let c = 0; c < wind.width; c += stride) {
        const u = wind.data[(r * wind.width + c) * 2];
        const v = wind.data[(r * wind.width + c) * 2 + 1];
        if (Number.isNaN(u) || Number.isNaN(v)) continue;
        const speed = Math.hypot(u, v);
        if (speed === 0) continue;
        const i = this.nodeCount++;
        this.nodeLon[i] = west + ((east - west) * c) / (wind.width - 1);
        this.nodeLat[i] = north - ((north - south) * r) / (wind.height - 1);
        this.nodeU[i] = u;
        this.nodeV[i] = v;
        this.nodeSpeed[i] = speed;
        this.nodePhaseOffset[i] = hash01(this.nodeLon[i], this.nodeLat[i]);
      }
    }
    this.sources = new Float32Array(this.nodeCount * 2);
    this.targets = new Float32Array(this.nodeCount * 2);
    this.colors = new Uint8Array(this.nodeCount * 4);
    for (let i = 0; i < this.nodeCount; i++) {
      this.colors[i * 4] = 255;
      this.colors[i * 4 + 1] = 255;
      this.colors[i * 4 + 2] = 255;
    }
  }

  update(view: Bounds, viewWidthPixels: number, nowSeconds: number): void {
    const lonPerPixel = (view[2] - view[0]) / Math.max(1, viewWidthPixels);
    for (let i = 0; i < this.nodeCount; i++) {
      const speed = this.nodeSpeed[i];
      const directionX = this.nodeU[i] / speed;
      const directionY = this.nodeV[i] / speed;
      const crawl = Math.min(
        MAX_CRAWL_PIXELS_PER_SECOND,
        speed * CRAWL_PIXELS_PER_SECOND_PER_METER_PER_SECOND,
      );
      const phase = fract((nowSeconds * crawl) / TRAVEL_DISTANCE_PIXELS + this.nodePhaseOffset[i]);
      const slidePixels = (phase - 0.5) * TRAVEL_DISTANCE_PIXELS;
      const lengthPixels = Math.min(
        DASH_MAX_LENGTH_PIXELS,
        DASH_BASE_LENGTH_PIXELS + speed * DASH_LENGTH_PIXELS_PER_METER_PER_SECOND,
      );
      const halfPixels = lengthPixels / 2;
      const latitudeCosine = Math.max(
        MIN_LATITUDE_COSINE,
        Math.cos((this.nodeLat[i] * Math.PI) / 180),
      );
      const lonPerDashPixel = directionX * lonPerPixel;
      const latPerDashPixel = directionY * lonPerPixel * latitudeCosine;
      const centerLon = this.nodeLon[i] + lonPerDashPixel * slidePixels;
      const centerLat = this.nodeLat[i] + latPerDashPixel * slidePixels;
      this.sources[i * 2] = centerLon - lonPerDashPixel * halfPixels;
      this.sources[i * 2 + 1] = centerLat - latPerDashPixel * halfPixels;
      this.targets[i * 2] = centerLon + lonPerDashPixel * halfPixels;
      this.targets[i * 2 + 1] = centerLat + latPerDashPixel * halfPixels;
      const fade = Math.min(1, phase / PHASE_FADE_FRACTION, (1 - phase) / PHASE_FADE_FRACTION);
      this.colors[i * 4 + 3] = Math.round(255 * fade);
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
    return {
      length: this.nodeCount,
      attributes: {
        getSourcePosition: { value: this.sources, size: 2 },
        getTargetPosition: { value: this.targets, size: 2 },
        getColor: { value: this.colors, size: 4 },
      },
    };
  }
}

function fract(value: number): number {
  return value - Math.floor(value);
}

function hash01(lon: number, lat: number): number {
  const quantizedLon = Math.round(lon * 8);
  const quantizedLat = Math.round(lat * 8);
  return fract(Math.sin(quantizedLon * 12.9898 + quantizedLat * 78.233) * 43758.5453);
}

export function renderParticleLayer(
  definition: ParticleLayerDefinition,
  field: WindDashField,
): Layer {
  return new LineLayer({
    id: definition.entry.id,
    data: field.layerData(),
    getWidth: 1.5,
    widthUnits: 'pixels',
    opacity: definition.opacity,
  });
}
