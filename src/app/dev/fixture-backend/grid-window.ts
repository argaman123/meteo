import { Bounds, FieldGridDocument } from '../../types/field-grid';

export interface FixtureManifest {
  runTimeUnixSeconds: number;
  stepHours: number;
  backHours: number;
  forwardHours: number;
}

export function sliceGridDocument(
  doc: FieldGridDocument,
  bounds: Bounds,
): FieldGridDocument | null {
  const [west, south, east, north] = bounds;
  const lastRow = doc.rows - 1;
  const lastCol = doc.cols - 1;
  const rowStart = Math.max(0, Math.floor((doc.startLat - north) / -doc.deltaLat));
  const rowEnd = Math.min(lastRow, Math.ceil((doc.startLat - south) / -doc.deltaLat));
  const colStart = Math.max(0, Math.floor((west - doc.startLon) / doc.deltaLon));
  const colEnd = Math.min(lastCol, Math.ceil((east - doc.startLon) / doc.deltaLon));
  if (rowStart > rowEnd || colStart > colEnd) return null;
  const values = doc.values
    .slice(rowStart, rowEnd + 1)
    .map((row) => row.slice(colStart, colEnd + 1));
  return {
    ...doc,
    startLat: doc.startLat + doc.deltaLat * rowStart,
    startLon: doc.startLon + doc.deltaLon * colStart,
    rows: rowEnd - rowStart + 1,
    cols: colEnd - colStart + 1,
    values,
  };
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
