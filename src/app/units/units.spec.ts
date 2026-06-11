import { describe, expect, it } from 'vitest';
import {
  MISSING_VALUE_TEXT,
  formatParameterValue,
  formatWind,
  knotsToMetersPerSecond,
  metersPerSecondToKnots,
} from './units';

describe('conversions', () => {
  it('round-trips knots and m/s', () => {
    expect(knotsToMetersPerSecond(10)).toBeCloseTo(5.14444, 4);
    expect(metersPerSecondToKnots(knotsToMetersPerSecond(7))).toBeCloseTo(7, 6);
  });
});

describe('formatParameterValue', () => {
  it('applies the central precision rules per parameter', () => {
    expect(formatParameterValue('temperature', 23.4)).toBe('23°C');
    expect(formatParameterValue('windSpeed', 12.3)).toBe('12 kt');
    expect(formatParameterValue('windDirection', 240.4)).toBe('240°');
    expect(formatParameterValue('waveHeight', 1.42)).toBe('1.4 m');
  });
  it('shows the missing marker for NaN', () => {
    expect(formatParameterValue('temperature', NaN)).toBe(MISSING_VALUE_TEXT);
  });
});

describe('formatWind', () => {
  it('combines speed and direction', () => {
    expect(formatWind(12.3, 240.4)).toBe('12 kt / 240°');
  });
  it('is missing if either part is missing', () => {
    expect(formatWind(NaN, 240)).toBe(MISSING_VALUE_TEXT);
  });
});
