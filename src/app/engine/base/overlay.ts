import maplibregl from 'maplibre-gl';
import { Bounds } from '../../types/wrap';
import { Rgba } from '../../utils/color-scale';
import { AnimationRenderer } from '../maplibre/animation-renderer';
import { AreaRenderer } from '../maplibre/area-renderer';
import { FeatureSource } from '../maplibre/feature-source';
import { IconRenderer } from '../maplibre/icon-renderer';
import { ImageRenderer } from '../maplibre/image-renderer';
import { LineRenderer } from '../maplibre/line-renderer';
import { OverlayRenderer } from '../maplibre/overlay-renderer';
import { TrailRenderer } from '../maplibre/trail-renderer';

export abstract class Overlay {
  abstract createRenderer(map: maplibregl.Map, id: string, source: FeatureSource): OverlayRenderer;
}

export class ImageOverlay extends Overlay {
  constructor(
    readonly image: ImageData | ImageBitmap | HTMLCanvasElement,
    readonly bounds: Bounds,
    readonly opacity: number,
  ) {
    super();
  }

  createRenderer(map: maplibregl.Map, id: string): OverlayRenderer {
    return new ImageRenderer(map, id);
  }
}

export interface Line {
  path: [number, number][];
  color: Rgba;
  width: number;
}

export class LineOverlay extends Overlay {
  constructor(
    readonly lines: Line[],
    readonly dashed = false,
  ) {
    super();
  }

  createRenderer(map: maplibregl.Map, id: string, source: FeatureSource): OverlayRenderer {
    return new LineRenderer(map, id, source);
  }
}

export interface Area {
  polygon: [number, number][];
  color: Rgba;
}

export class AreaOverlay extends Overlay {
  constructor(readonly areas: Area[]) {
    super();
  }

  createRenderer(map: maplibregl.Map, id: string, source: FeatureSource): OverlayRenderer {
    return new AreaRenderer(map, id, source);
  }
}

export interface Sprite {
  key: string;
  create: () => HTMLCanvasElement;
}

export enum IconScaling {
  Pixels,
  World,
}

export interface Icon {
  position: [number, number];
  sprite: Sprite;
  size: number;
  angle: number;
  opacity: number;
}

export class IconOverlay extends Overlay {
  constructor(
    readonly icons: Icon[],
    readonly scaling: IconScaling,
  ) {
    super();
  }

  createRenderer(map: maplibregl.Map, id: string, source: FeatureSource): OverlayRenderer {
    return new IconRenderer(map, id, source);
  }
}

export interface AnimationFrame {
  deltaSeconds: number;
  pixelRatio: number;
  toCanvas: (lon: number, lat: number) => [number, number];
}

export class AnimationOverlay extends Overlay {
  constructor(
    readonly bounds: Bounds,
    readonly paint: (context: CanvasRenderingContext2D, frame: AnimationFrame) => void,
  ) {
    super();
  }

  createRenderer(map: maplibregl.Map, id: string): OverlayRenderer {
    return new AnimationRenderer(map, id);
  }
}

export class TrailOverlay extends Overlay {
  constructor(
    readonly bounds: Bounds,
    readonly ink: string,
    readonly lineWidth: number,
    readonly decay: number,
    readonly opacity: number,
    readonly advance: (deltaSeconds: number) => Float32Array,
  ) {
    super();
  }

  createRenderer(map: maplibregl.Map, id: string): OverlayRenderer {
    return new TrailRenderer(map, id);
  }
}
