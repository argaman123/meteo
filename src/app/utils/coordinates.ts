import { LatLon, Utm } from 'geodesy/mgrs.js';

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

export const LEFT_TO_RIGHT_MARK = '\u200E';

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

export function parseCoordinates(text: string, format: CoordinateFormat): [number, number] | null {
  const point = parserOf(format)(text.replaceAll(LEFT_TO_RIGHT_MARK, '').trim());
  if (!point || point[0] > 180 || point[1] > 90) return null;
  return point;
}

function parserOf(format: CoordinateFormat): (text: string) => [number, number] | null {
  switch (format) {
    case CoordinateFormat.Decimal:
      return parseDecimal;
    case CoordinateFormat.DegreesMinutesSeconds:
      return parseDegreesMinutesSeconds;
    case CoordinateFormat.Utm:
      return parseUtm;
    case CoordinateFormat.OperationalGrid:
      return parseOperationalGrid;
  }
}

function parseDecimal(text: string): [number, number] | null {
  const match = /^(\d+\.\d+)(?: N)?, (\d+\.\d+)(?: E)?$/.exec(text);
  return match && [Number(match[2]), Number(match[1])];
}

function parseDegreesMinutesSeconds(text: string): [number, number] | null {
  const match = /^(\d+)°(\d+)'(\d+)"N (\d+)°(\d+)'(\d+)"E$/.exec(text);
  if (!match) return null;
  const [lat, lon] = [match.slice(1, 4), match.slice(4, 7)].map(
    ([degrees, minutes, seconds]) =>
      Number(degrees) + Number(minutes) / 60 + Number(seconds) / 3600,
  );
  return [lon, lat];
}

function parseUtm(text: string): [number, number] | null {
  const match = /^(\d{1,2})[A-Z]? (\d+)E (\d+)N$/.exec(text);
  if (!match) return null;
  try {
    const { lat, lon } = new Utm(
      Number(match[1]),
      'N',
      Number(match[2]),
      Number(match[3]),
    ).toLatLon();
    return [lon, lat];
  } catch {
    return null;
  }
}

const OPERATIONAL_GRID_CORNERS = new Map(
  Object.entries(OPERATIONAL_GRID_SQUARES).flatMap(([lat, squares]) =>
    Object.entries(squares).map(([lon, square]) => [square, [Number(lon), Number(lat)]] as const),
  ),
);

function parseOperationalGrid(text: string): [number, number] | null {
  const match = /^(\d{2}) (\d{2}) ([א-ת]{1,2})$/.exec(text);
  if (!match) return null;
  const corner = OPERATIONAL_GRID_CORNERS.get(match[3]);
  const latMinutes = Number(match[1]);
  const lonMinutes = Number(match[2]);
  if (!corner || latMinutes > 59 || lonMinutes > 59) return null;
  return [corner[0] + (lonMinutes + 0.5) / 60, corner[1] + (latMinutes + 0.5) / 60];
}
