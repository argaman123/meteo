import { LatLon } from 'geodesy/mgrs.js';
import { Bounds } from '../types/wrap';

export enum CoordinateFormat {
  Decimal = 'decimal',
  DegreesMinutesSeconds = 'degrees-minutes-seconds',
  Utm = 'utm',
  OperationalGrid = 'operational-grid',
}

export function formatCoordinates(lon: number, lat: number, format: CoordinateFormat): string {
  switch (format) {
    case CoordinateFormat.Decimal:
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    case CoordinateFormat.DegreesMinutesSeconds:
      return formatLatLonDegreesMinutesSeconds(lon, lat);
    case CoordinateFormat.Utm:
      return formatUtm(lon, lat);
    case CoordinateFormat.OperationalGrid:
      return formatOperationalGrid(lon, lat);
  }
}

export function formatDegrees(angle: number, format: CoordinateFormat): string {
  switch (format) {
    case CoordinateFormat.Decimal:
    case CoordinateFormat.Utm:
    case CoordinateFormat.OperationalGrid:
      return `${angle.toFixed(4)}°`;
    case CoordinateFormat.DegreesMinutesSeconds:
      return formatDegreesMinutesSeconds(angle);
  }
}

function formatLatLonDegreesMinutesSeconds(lon: number, lat: number): string {
  return `${formatDegreesMinutesSeconds(lat)}${lat < 0 ? 'S' : 'N'} ${formatDegreesMinutesSeconds(lon)}${lon < 0 ? 'W' : 'E'}`;
}

function formatDegreesMinutesSeconds(value: number): string {
  const totalSeconds = Math.round(Math.abs(value) * 3600);
  const degrees = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${degrees}°${pad(minutes)}'${pad(seconds)}"`;
}

function formatUtm(lon: number, lat: number): string {
  if (lat < -80 || lat > 84) return formatLatLonDegreesMinutesSeconds(lon, lat);
  const utm = new LatLon(lat, lon).toUtm();
  return `${utm.zone}${utm.toMgrs().band} ${Math.round(utm.easting)}E ${Math.round(utm.northing)}N`;
}

const OPERATIONAL_GRID_SQUARES: Record<number, Record<number, string>> = {
  34: { 33: 'גס', 34: 'גנ', 35: 'גמ', 36: 'גל' },
  33: { 33: 'גר', 34: 'גק', 35: 'גצ', 36: 'גפ' },
  32: { 33: 'ד', 34: 'ג', 35: 'ב', 36: 'א' },
  31: { 33: 'ט', 34: 'ח', 35: 'ז', 36: 'ו' },
  30: { 33: 'ס', 34: 'נ', 35: 'מ', 36: 'ל' },
  29: { 33: 'ר', 34: 'ק', 35: 'צ', 36: 'פ' },
};

const LEFT_TO_RIGHT_MARK = '\u200E';

function formatOperationalGrid(lon: number, lat: number): string {
  const square = OPERATIONAL_GRID_SQUARES[Math.floor(lat)]?.[Math.floor(lon)];
  if (!square) return formatLatLonDegreesMinutesSeconds(lon, lat);
  return `${LEFT_TO_RIGHT_MARK}${wholeMinutesOf(lat)} ${wholeMinutesOf(lon)} ${square}`;
}

function wholeMinutesOf(angle: number): string {
  const absolute = Math.abs(angle);
  const minutes = Math.floor((absolute - Math.floor(absolute)) * 60);
  return String(minutes).padStart(2, '0');
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
