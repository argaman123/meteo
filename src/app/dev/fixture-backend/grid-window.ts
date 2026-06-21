import { Bounds, Wrap } from '../../types/wrap';

export interface FixtureManifest {
  runTimeUnixSeconds: number;
  stepHours: number;
  backHours: number;
  forwardHours: number;
}

export const RESPONSE_SIZE = 70;

export function resampleGridDocument(
  doc: Wrap,
  bounds: Bounds,
  size = RESPONSE_SIZE,
): Wrap | null {
  const rows = doc.values.length;
  const cols = rows > 0 ? doc.values[0].length : 0;
  const gridWest = doc.start_x;
  const gridNorth = doc.start_y;
  const gridEast = doc.start_x + doc.rx * (cols - 1);
  const gridSouth = doc.start_y + doc.ry * (rows - 1);
  const west = Math.max(bounds[0], gridWest);
  const east = Math.min(bounds[2], gridEast);
  const south = Math.max(bounds[1], gridSouth);
  const north = Math.min(bounds[3], gridNorth);
  if (west >= east || south >= north) return null;
  const values: (number | null)[][] = [];
  for (let r = 0; r < size; r++) {
    const lat = north + ((south - north) * r) / (size - 1);
    const row: (number | null)[] = [];
    for (let c = 0; c < size; c++) {
      const lon = west + ((east - west) * c) / (size - 1);
      row.push(sampleDocument(doc, lon, lat));
    }
    values.push(row);
  }
  return {
    ...doc,
    start_y: north,
    start_x: west,
    ry: (south - north) / (size - 1),
    rx: (east - west) / (size - 1),
    values,
  };
}

function sampleDocument(doc: Wrap, lon: number, lat: number): number | null {
  const rows = doc.values.length;
  const cols = rows > 0 ? doc.values[0].length : 0;
  const col = (lon - doc.start_x) / doc.rx;
  const row = (lat - doc.start_y) / doc.ry;
  if (col < -0.5 || row < -0.5 || col > cols - 0.5 || row > rows - 0.5) return null;
  const nearest = doc.values[clampIndex(Math.round(row), rows)][clampIndex(Math.round(col), cols)];
  if (nearest === null) return null;
  const c0 = clampIndex(Math.floor(col), cols);
  const r0 = clampIndex(Math.floor(row), rows);
  const c1 = Math.min(c0 + 1, cols - 1);
  const r1 = Math.min(r0 + 1, rows - 1);
  const fc = Math.min(1, Math.max(0, col - c0));
  const fr = Math.min(1, Math.max(0, row - r0));
  const corners = [
    doc.values[r0][c0],
    doc.values[r0][c1],
    doc.values[r1][c0],
    doc.values[r1][c1],
  ];
  const weights = [(1 - fc) * (1 - fr), fc * (1 - fr), (1 - fc) * fr, fc * fr];
  if (doc.wrap_info.param === 'windDirection') return interpolateDirection(corners, weights);
  let sum = 0;
  let weightSum = 0;
  for (let i = 0; i < 4; i++) {
    const corner = corners[i];
    if (corner === null) continue;
    sum += corner * weights[i];
    weightSum += weights[i];
  }
  return weightSum > 0 ? roundTenth(sum / weightSum) : null;
}

function interpolateDirection(corners: (number | null)[], weights: number[]): number | null {
  let x = 0;
  let y = 0;
  let weightSum = 0;
  for (let i = 0; i < 4; i++) {
    const corner = corners[i];
    if (corner === null) continue;
    const radians = (corner * Math.PI) / 180;
    x += Math.sin(radians) * weights[i];
    y += Math.cos(radians) * weights[i];
    weightSum += weights[i];
  }
  if (weightSum === 0) return null;
  const degrees = (Math.atan2(x, y) * 180) / Math.PI;
  return roundTenth((degrees + 360) % 360);
}

function clampIndex(index: number, length: number): number {
  return Math.min(length - 1, Math.max(0, index));
}

function roundTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

export function nearestFrameHours(timeUnixSeconds: number, manifest: FixtureManifest): number {
  const offsetHours = (timeUnixSeconds - manifest.runTimeUnixSeconds) / 3600;
  const snapped = Math.round(offsetHours / manifest.stepHours) * manifest.stepHours;
  return Math.min(manifest.forwardHours, Math.max(-manifest.backHours, snapped));
}

export function fixtureFileName(parameter: string, hours: number): string {
  const sign = hours < 0 ? '-' : '+';
  return `${parameter}_${sign}${String(Math.abs(hours)).padStart(3, '0')}.json`;
}
