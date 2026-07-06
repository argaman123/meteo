import { Bounds } from '../../types/wrap';
import { MercatorBand } from '../../utils/geo';

export class GeoCanvas {
  readonly width: number;
  readonly height: number;
  private readonly canvases = [document.createElement('canvas'), document.createElement('canvas')];
  private flip = 0;
  private readonly west: number;
  private readonly lonSpan: number;
  private readonly band: MercatorBand;

  constructor(bounds: Bounds, width = 1024) {
    const [west, south, east, north] = bounds;
    this.west = west;
    this.lonSpan = east - west;
    this.band = new MercatorBand(north, south);
    this.width = width;
    this.height = Math.max(2, Math.round((width * (north - south)) / this.lonSpan));
    for (const canvas of this.canvases) {
      canvas.width = this.width;
      canvas.height = this.height;
    }
  }

  get image(): HTMLCanvasElement {
    return this.canvases[this.flip];
  }

  begin(): CanvasRenderingContext2D {
    this.flip = 1 - this.flip;
    const context = this.canvases[this.flip].getContext('2d')!;
    context.clearRect(0, 0, this.width, this.height);
    return context;
  }

  toX(lon: number): number {
    return ((lon - this.west) / this.lonSpan) * this.width;
  }

  toY(lat: number): number {
    return this.band.fractionOf(lat) * this.height;
  }
}
