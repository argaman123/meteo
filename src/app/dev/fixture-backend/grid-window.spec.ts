import { describe, expect, it } from 'vitest';
import { FieldGridDocument } from '../../types/field-grid';
import { fixtureFileName, nearestFrameHours, sliceGridDocument } from './grid-window';

const doc: FieldGridDocument = {
  parameter: 'temperature',
  level: 'surface',
  units: 'C',
  runTime: '2026-06-11T00:00Z',
  forecastHours: 0,
  startLat: 60,
  startLon: 0,
  deltaLat: -1,
  deltaLon: 1,
  rows: 41,
  cols: 61,
  values: Array.from({ length: 41 }, (_, r) => Array.from({ length: 61 }, (_, c) => r * 100 + c)),
};

describe('sliceGridDocument', () => {
  it('returns the sub-grid covering the bbox, edges included', () => {
    const sliced = sliceGridDocument(doc, [10.5, 49.5, 20.5, 55.5]);
    expect(sliced).not.toBeNull();
    expect(sliced!.startLat).toBe(56);
    expect(sliced!.startLon).toBe(10);
    expect(sliced!.rows).toBe(8);
    expect(sliced!.cols).toBe(12);
    expect(sliced!.values[0][0]).toBe(4 * 100 + 10);
  });
  it('clamps to the grid extents', () => {
    const sliced = sliceGridDocument(doc, [-20, 50, 5, 90]);
    expect(sliced!.startLat).toBe(60);
    expect(sliced!.startLon).toBe(0);
  });
  it('returns null when there is no intersection', () => {
    expect(sliceGridDocument(doc, [100, 10, 110, 15])).toBeNull();
  });
});

describe('nearestFrameHours', () => {
  const manifest = {
    runTimeUnixSeconds: 1_000_000 * 3600,
    stepHours: 3,
    backHours: 24,
    forwardHours: 96,
  };
  it('rounds to the nearest step', () => {
    expect(nearestFrameHours(manifest.runTimeUnixSeconds + 4 * 3600, manifest)).toBe(3);
  });
  it('clamps to the available window', () => {
    expect(nearestFrameHours(manifest.runTimeUnixSeconds + 999 * 3600, manifest)).toBe(96);
    expect(nearestFrameHours(manifest.runTimeUnixSeconds - 999 * 3600, manifest)).toBe(-24);
  });
});

describe('fixtureFileName', () => {
  it('formats signed zero-padded hours', () => {
    expect(fixtureFileName('temperature', -24)).toBe('temperature_-024.json');
    expect(fixtureFileName('windSpeed', 9)).toBe('windSpeed_+009.json');
  });
});
