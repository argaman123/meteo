import { Bounds } from '../types/wrap';

export enum CoordinateFormat {
  Decimal = 'decimal',
  DegreesMinutesSeconds = 'degrees-minutes-seconds',
}

export function formatCoordinates(lon: number, lat: number, format: CoordinateFormat): string {
  switch (format) {
    case CoordinateFormat.Decimal:
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    case CoordinateFormat.DegreesMinutesSeconds:
      return `${formatDegreesMinutesSeconds(lat, 'N', 'S')} ${formatDegreesMinutesSeconds(lon, 'E', 'W')}`;
  }
}

function formatDegreesMinutesSeconds(value: number, positive: string, negative: string): string {
  const totalSeconds = Math.round(Math.abs(value) * 3600);
  const degrees = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${degrees}°${pad(minutes)}'${pad(seconds)}"${value < 0 ? negative : positive}`;
}

export function contains(bounds: Bounds, lon: number, lat: number): boolean {
  const [west, south, east, north] = bounds;
  return lon >= west && lon <= east && lat >= south && lat <= north;
}

export function containsBounds(outer: Bounds, inner: Bounds): boolean {
  const [west, south, east, north] = inner;
  return contains(outer, west, south) && contains(outer, east, north);
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

export function nearestPoint<P extends { lon: number; lat: number }>(
  points: P[],
  lon: number,
  lat: number,
  maxDistance: number,
): P | undefined {
  let nearest: P | undefined = undefined;
  let best = maxDistance;
  for (const point of points) {
    const distance = Math.hypot(point.lon - lon, point.lat - lat);
    if (distance < best) {
      best = distance;
      nearest = point;
    }
  }
  return nearest;
}
