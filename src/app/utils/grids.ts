import { FieldGrid, FieldGridDocument, VectorField } from '../types/field-grid';

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
