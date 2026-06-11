import { FieldGrid, FieldGridDocument, VectorField } from '../types/field-grid';

export function parseFieldGrid(doc: FieldGridDocument): FieldGrid {
  const data = new Float32Array(doc.rows * doc.cols);
  for (let r = 0; r < doc.rows; r++) {
    for (let c = 0; c < doc.cols; c++) {
      const value = doc.values[r][c];
      data[r * doc.cols + c] = value === null ? NaN : value;
    }
  }
  const north = doc.startLat;
  const south = doc.startLat + doc.deltaLat * (doc.rows - 1);
  const west = doc.startLon;
  const east = doc.startLon + doc.deltaLon * (doc.cols - 1);
  return {
    parameter: doc.parameter,
    units: doc.units,
    bounds: [west, south, east, north],
    width: doc.cols,
    height: doc.rows,
    data,
  };
}

export function sampleGrid(grid: FieldGrid, lon: number, lat: number): number {
  const [west, south, east, north] = grid.bounds;
  const col = ((lon - west) / (east - west)) * (grid.width - 1);
  const row = ((north - lat) / (north - south)) * (grid.height - 1);
  if (col < 0 || row < 0 || col > grid.width - 1 || row > grid.height - 1) return NaN;
  const c0 = Math.floor(col);
  const r0 = Math.floor(row);
  const c1 = Math.min(c0 + 1, grid.width - 1);
  const r1 = Math.min(r0 + 1, grid.height - 1);
  const fc = col - c0;
  const fr = row - r0;
  const v00 = grid.data[r0 * grid.width + c0];
  const v01 = grid.data[r0 * grid.width + c1];
  const v10 = grid.data[r1 * grid.width + c0];
  const v11 = grid.data[r1 * grid.width + c1];
  const top = v00 * (1 - fc) + v01 * fc;
  const bottom = v10 * (1 - fc) + v11 * fc;
  return top * (1 - fr) + bottom * fr;
}

export function sampleVectorField(field: VectorField, lon: number, lat: number): [number, number] {
  const [west, south, east, north] = field.bounds;
  const col = ((lon - west) / (east - west)) * (field.width - 1);
  const row = ((north - lat) / (north - south)) * (field.height - 1);
  if (col < 0 || row < 0 || col > field.width - 1 || row > field.height - 1) return [NaN, NaN];
  const c = Math.round(col);
  const r = Math.round(row);
  const index = (r * field.width + c) * 2;
  return [field.data[index], field.data[index + 1]];
}

export function mapGridValues(
  grid: FieldGrid,
  transform: (value: number) => number,
  units: string,
): FieldGrid {
  const data = new Float32Array(grid.data.length);
  for (let i = 0; i < grid.data.length; i++) data[i] = transform(grid.data[i]);
  return { ...grid, units, data };
}

export function toVectorField(speed: FieldGrid, direction: FieldGrid): VectorField {
  const data = new Float32Array(speed.width * speed.height * 2);
  for (let i = 0; i < speed.data.length; i++) {
    const radians = (direction.data[i] * Math.PI) / 180;
    data[i * 2] = -speed.data[i] * Math.sin(radians);
    data[i * 2 + 1] = -speed.data[i] * Math.cos(radians);
  }
  return { bounds: speed.bounds, width: speed.width, height: speed.height, data };
}
