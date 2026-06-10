export interface FieldGridDocument {
  parameter: string;
  level: string;
  units: string;
  runTime: string;
  forecastHours: number;
  startLat: number;
  startLon: number;
  deltaLat: number;
  deltaLon: number;
  rows: number;
  cols: number;
  values: number[][];
}

export interface FieldGrid {
  parameter: string;
  units: string;
  runTime: string;
  forecastHours: number;
  bounds: [number, number, number, number];
  width: number;
  height: number;
  data: Float32Array;
}

export interface VectorField {
  bounds: [number, number, number, number];
  width: number;
  height: number;
  data: Float32Array;
}

export function parseFieldGrid(doc: FieldGridDocument): FieldGrid {
  const data = new Float32Array(doc.rows * doc.cols);
  for (let r = 0; r < doc.rows; r++) {
    for (let c = 0; c < doc.cols; c++) {
      data[r * doc.cols + c] = doc.values[r][c];
    }
  }
  const north = doc.startLat;
  const south = doc.startLat + doc.deltaLat * (doc.rows - 1);
  const west = doc.startLon;
  const east = doc.startLon + doc.deltaLon * (doc.cols - 1);
  return {
    parameter: doc.parameter,
    units: doc.units,
    runTime: doc.runTime,
    forecastHours: doc.forecastHours,
    bounds: [west, south, east, north],
    width: doc.cols,
    height: doc.rows,
    data,
  };
}

const KNOTS_TO_METERS_PER_SECOND = 0.514444;

export function convertKnotsToMetersPerSecond(grid: FieldGrid): FieldGrid {
  const data = new Float32Array(grid.data.length);
  for (let i = 0; i < grid.data.length; i++) {
    data[i] = grid.data[i] * KNOTS_TO_METERS_PER_SECOND;
  }
  return { ...grid, units: 'm/s', data };
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

export function downsampleGrid(grid: FieldGrid, maxDimension: number): FieldGrid {
  if (grid.width <= maxDimension && grid.height <= maxDimension) return grid;
  const step = Math.ceil(Math.max(grid.width, grid.height) / maxDimension);
  const width = Math.ceil(grid.width / step);
  const height = Math.ceil(grid.height / step);
  const data = new Float32Array(width * height);
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      data[r * width + c] = grid.data[r * step * grid.width + c * step];
    }
  }
  return { ...grid, width, height, data };
}
