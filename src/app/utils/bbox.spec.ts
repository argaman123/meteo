import { describe, expect, it } from 'vitest';
import { containsBounds, coveredFraction, expandBounds } from './bbox';

describe('expandBounds', () => {
  it('pads each side by the factor of the span', () => {
    expect(expandBounds([10, 20, 30, 40], 0.25)).toEqual([5, 15, 35, 45]);
  });
  it('clamps latitude to the mercator-safe range', () => {
    expect(expandBounds([0, -84, 10, 84], 0.5)[1]).toBe(-85);
    expect(expandBounds([0, -84, 10, 84], 0.5)[3]).toBe(85);
  });
});

describe('coveredFraction', () => {
  it('returns 1 when the view sits fully inside the coverage', () => {
    expect(coveredFraction([10, 10, 20, 20], [0, 0, 50, 50])).toBe(1);
  });
  it('returns the visible-area fraction on partial overlap', () => {
    expect(coveredFraction([0, 0, 10, 10], [5, 0, 50, 10])).toBeCloseTo(0.5, 6);
  });
  it('returns 0 with no overlap', () => {
    expect(coveredFraction([0, 0, 10, 10], [20, 20, 30, 30])).toBe(0);
  });
});

describe('containsBounds', () => {
  it('is true when inner fits inside outer', () => {
    expect(containsBounds([0, 0, 10, 10], [1, 1, 9, 9])).toBe(true);
  });
  it('is false when inner crosses any edge', () => {
    expect(containsBounds([0, 0, 10, 10], [1, 1, 11, 9])).toBe(false);
  });
});
