// TODO: UNVERIFIED CODE BELOW
import maplibregl from 'maplibre-gl';
import { Bounds } from '../../types/wrap';
import type { ImageOverlay } from '../base/overlay';
import { OverlayRenderer } from './overlay-renderer';

export class ImageRenderer extends OverlayRenderer<ImageOverlay> {
  private readonly canvas = document.createElement('canvas');
  private drawn: ImageOverlay['image'] | null = null;

  layerIds(): string[] {
    return [this.id];
  }

  protected add(overlay: ImageOverlay): void {
    this.paint(overlay.image);
    if (!this.map.getSource(this.id)) {
      this.map.addSource(this.id, {
        type: 'canvas',
        canvas: this.canvas,
        animate: false,
        coordinates: cornersOf(overlay.bounds),
      });
    }
    this.map.addLayer({
      id: this.id,
      type: 'raster',
      source: this.id,
      paint: { 'raster-opacity': coverageOf(overlay.opacity), 'raster-fade-duration': 0 },
    });
  }

  protected update(overlay: ImageOverlay, previous: ImageOverlay): void {
    const source = this.map.getSource<maplibregl.CanvasSource>(this.id);
    if (!source) return;
    if (overlay.bounds.some((value, index) => value !== previous.bounds[index])) {
      source.setCoordinates(cornersOf(overlay.bounds));
    }
    if (overlay.image !== this.drawn) {
      this.paint(overlay.image);
      source.play?.();
      source.pause?.();
      this.map.triggerRepaint();
    }
    if (overlay.opacity !== previous.opacity) {
      this.map.setPaintProperty(this.id, 'raster-opacity', coverageOf(overlay.opacity));
    }
  }

  private paint(image: ImageOverlay['image']): void {
    if (this.canvas.width !== image.width || this.canvas.height !== image.height) {
      this.canvas.width = image.width;
      this.canvas.height = image.height;
    }
    const context = this.canvas.getContext('2d')!;
    if (image instanceof ImageData) {
      context.putImageData(image, 0, 0);
    } else {
      context.clearRect(0, 0, image.width, image.height);
      context.drawImage(image, 0, 0);
    }
    this.drawn = image;
  }
}

export function coverageOf(opacity: number): number {
  return 1 - Math.pow(1 - opacity, 1.75);
}

export function cornersOf([west, south, east, north]: Bounds): maplibregl.Coordinates {
  return [
    [west, north],
    [east, north],
    [east, south],
    [west, south],
  ];
}
