// TODO: UNVERIFIED CODE BELOW
import { Quality, quality } from '../../pages/home/settings-panel/settings-controls';
import { Bounds } from '../../types/wrap';
import { MercatorBand } from '../../utils/geo';
import type { AnimationFrame, AnimationOverlay } from '../base/overlay';
import { cornersOf } from './image-renderer';
import { OverlayRenderer } from './overlay-renderer';

export class AnimationRenderer extends OverlayRenderer<AnimationOverlay> {
  private readonly canvas = document.createElement('canvas');
  private raf = 0;
  private lastTime = performance.now();
  private pixelRatio = devicePixelRatio;
  private toCanvas: AnimationFrame['toCanvas'] = () => [0, 0];

  layerIds(): string[] {
    return [this.id];
  }

  override setOverlay(overlay: AnimationOverlay): void {
    if (!this.overlay || !sameBounds(overlay.bounds, this.overlay.bounds)) this.fitCanvas(overlay.bounds);
    super.setOverlay(overlay);
    if (!this.raf) this.raf = requestAnimationFrame(this.animate);
  }

  override destroy(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    super.destroy();
  }

  protected add(overlay: AnimationOverlay): void {
    if (!this.map.getSource(this.id)) {
      this.map.addSource(this.id, {
        type: 'canvas',
        canvas: this.canvas,
        animate: true,
        coordinates: cornersOf(overlay.bounds),
      });
    }
    this.map.addLayer({
      id: this.id,
      type: 'raster',
      source: this.id,
      paint: { 'raster-fade-duration': 0 },
    });
  }

  protected update(overlay: AnimationOverlay, previous: AnimationOverlay): void {
    if (!sameBounds(overlay.bounds, previous.bounds)) {
      this.map.getSource<maplibregl.CanvasSource>(this.id)?.setCoordinates(cornersOf(overlay.bounds));
    }
  }

  private fitCanvas(bounds: Bounds): void {
    const [west, south, east, north] = bounds;
    const midLat = (south + north) / 2;
    const span = Math.abs(this.map.project([east, midLat]).x - this.map.project([west, midLat]).x);
    this.pixelRatio = quality() === Quality.Low ? devicePixelRatio / 2 : devicePixelRatio;
    const width = Math.max(256, Math.min(2048, Math.round(span * this.pixelRatio)));
    const height = Math.max(2, Math.round((width * (north - south)) / (east - west)));
    this.canvas.width = width;
    this.canvas.height = height;
    const band = new MercatorBand(north, south);
    this.toCanvas = (lon, lat) => [((lon - west) / (east - west)) * width, band.fractionOf(lat) * height];
  }

  private animate = (now: number): void => {
    this.raf = requestAnimationFrame(this.animate);
    if (!this.overlay) return;
    if (quality() === Quality.Low && now - this.lastTime < 30) return;
    const deltaSeconds = Math.min(0.1, (now - this.lastTime) / 1000 || 0.016);
    this.lastTime = now;
    const context = this.canvas.getContext('2d')!;
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.overlay.paint(context, { deltaSeconds, pixelRatio: this.pixelRatio, toCanvas: this.toCanvas });
    this.map.triggerRepaint();
  };
}

function sameBounds(a: Bounds, b: Bounds): boolean {
  return a.every((value, index) => value === b[index]);
}
