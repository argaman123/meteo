import { FieldGrid } from '../types/field-grid';

const KNOTS_TO_METERS_PER_SECOND = 0.514444;

export function convertKnotsToMetersPerSecond(grid: FieldGrid): FieldGrid {
  const data = new Float32Array(grid.data.length);
  for (let i = 0; i < grid.data.length; i++) {
    data[i] = grid.data[i] * KNOTS_TO_METERS_PER_SECOND;
  }
  return { ...grid, units: 'm/s', data };
}
