import { Bounds } from '../types/wrap';

export function contains(bounds: Bounds, lon: number, lat: number): boolean {
  const [west, south, east, north] = bounds;
  return lon >= west && lon <= east && lat >= south && lat <= north;
}

function mercatorY(lat: number): number {
  return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
}

function inverseMercatorY(y: number): number {
  return (Math.atan(Math.sinh(y)) * 180) / Math.PI;
}

export class MercatorBand {
  private readonly top: number;
  private readonly span: number;

  constructor(north: number, south: number) {
    this.top = mercatorY(north);
    this.span = mercatorY(south) - this.top;
  }

  fractionOf(lat: number): number {
    return (mercatorY(lat) - this.top) / this.span;
  }

  latAt(fraction: number): number {
    return inverseMercatorY(this.top + fraction * this.span);
  }
}
