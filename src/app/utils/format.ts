const METERS_PER_SECOND_PER_KNOT = 0.514444;

export const MISSING_VALUE_TEXT = '—';

export function metersPerSecondToKnots(metersPerSecond: number): number {
  return metersPerSecond / METERS_PER_SECOND_PER_KNOT;
}

export function formatNumber(value: number, decimals: number, suffix: string): string {
  if (Number.isNaN(value)) return MISSING_VALUE_TEXT;
  return value.toFixed(decimals) + suffix;
}
