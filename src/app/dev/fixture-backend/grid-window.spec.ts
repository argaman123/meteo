import { describe, expect, it } from 'vitest';
import { FieldGridDocument } from '../../types/field-grid';
import { fixtureFileName, nearestFrameHours, resampleGridDocument } from './grid-window';

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

describe('resampleGridDocument', () => {
  it('returns a fixed-size grid covering the requested bbox', () => {
    const sampled = resampleGridDocument(doc, [10, 50, 20, 56]);
    expect(sampled).not.toBeNull();
    expect(sampled!.rows).toBe(70);
    expect(sampled!.cols).toBe(70);
    expect(sampled!.startLat).toBe(56);
    expect(sampled!.startLon).toBe(10);
    expect(sampled!.values[0][0]).toBe(410);
    expect(sampled!.values[69][69]).toBe(1020);
  });
  it('interpolates between source cells', () => {
    const sampled = resampleGridDocument(doc, [10, 50, 11, 51], 3);
    expect(sampled!.values[1][1]).toBe(960.5);
  });
  it('clamps to the grid extents', () => {
    const sampled = resampleGridDocument(doc, [-20, 50, 5, 90]);
    expect(sampled!.startLat).toBe(60);
    expect(sampled!.startLon).toBe(0);
  });
  it('returns null when there is no intersection', () => {
    expect(resampleGridDocument(doc, [100, 10, 110, 15])).toBeNull();
  });
  it('keeps missing cells missing via nearest lookup', () => {
    const withHole: FieldGridDocument = { ...doc, values: doc.values.map((row) => [...row]) };
    withHole.values[4][10] = null;
    const sampled = resampleGridDocument(withHole, [9.6, 55.6, 10.4, 56.4], 3);
    expect(sampled!.values[1][1]).toBeNull();
  });
  it('interpolates wind direction as vectors across the north seam', () => {
    const direction: FieldGridDocument = {
      ...doc,
      units: 'deg',
      rows: 2,
      cols: 2,
      values: [
        [350, 10],
        [350, 10],
      ],
    };
    const sampled = resampleGridDocument(direction, [0, 59, 1, 60], 3);
    expect(sampled!.values[1][1]).toBe(0);
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
