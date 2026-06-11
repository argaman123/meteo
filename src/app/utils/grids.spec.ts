import { describe, expect, it } from 'vitest';
import { FieldGridDocument } from '../types/field-grid';
import { parseFieldGrid, sampleGrid } from './grids';

const doc: FieldGridDocument = {
  parameter: 'temperature',
  level: 'surface',
  units: 'C',
  runTime: '2026-06-11T00:00Z',
  forecastHours: 0,
  startLat: 40,
  startLon: 10,
  deltaLat: -10,
  deltaLon: 10,
  rows: 3,
  cols: 3,
  values: [
    [0, 10, 20],
    [10, 20, 30],
    [null, 30, 40],
  ],
};

describe('parseFieldGrid', () => {
  it('computes bounds with row 0 = north and converts null to NaN', () => {
    const grid = parseFieldGrid(doc);
    expect(grid.bounds).toEqual([10, 20, 30, 40]);
    expect(grid.data[0]).toBe(0);
    expect(Number.isNaN(grid.data[6])).toBe(true);
  });
});

describe('sampleGrid', () => {
  const grid = parseFieldGrid(doc);
  it('returns exact values on grid points', () => {
    expect(sampleGrid(grid, 10, 40)).toBe(0);
    expect(sampleGrid(grid, 30, 20)).toBe(40);
  });
  it('interpolates bilinearly between points', () => {
    expect(sampleGrid(grid, 15, 40)).toBe(5);
    expect(sampleGrid(grid, 15, 35)).toBe(10);
  });
  it('returns NaN outside the grid and near missing cells', () => {
    expect(Number.isNaN(sampleGrid(grid, 9, 40))).toBe(true);
    expect(Number.isNaN(sampleGrid(grid, 12, 22))).toBe(true);
  });
});
