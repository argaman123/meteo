import { describe, expect, it } from 'vitest';
import { clampToRange, snapToStep } from './time';

describe('snapToStep', () => {
  it('snaps to the nearest step boundary', () => {
    expect(snapToStep(10_800 + 5_000, 3)).toBe(10_800);
    expect(snapToStep(10_800 + 6_000, 3)).toBe(21_600);
  });
});

describe('clampToRange', () => {
  it('clamps below, inside, above', () => {
    expect(clampToRange(-5, 0, 10)).toBe(0);
    expect(clampToRange(5, 0, 10)).toBe(5);
    expect(clampToRange(15, 0, 10)).toBe(10);
  });
});
