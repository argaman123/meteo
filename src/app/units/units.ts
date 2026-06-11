const METERS_PER_SECOND_PER_KNOT = 0.514444;

export const MISSING_VALUE_TEXT = '—';

export function knotsToMetersPerSecond(knots: number): number {
  return knots * METERS_PER_SECOND_PER_KNOT;
}

export function metersPerSecondToKnots(metersPerSecond: number): number {
  return metersPerSecond / METERS_PER_SECOND_PER_KNOT;
}

interface ParameterDisplayRule {
  decimals: number;
  suffix: string;
}

const PARAMETER_DISPLAY_RULES: Record<string, ParameterDisplayRule> = {
  temperature: { decimals: 0, suffix: '°C' },
  windSpeed: { decimals: 0, suffix: ' kt' },
  windDirection: { decimals: 0, suffix: '°' },
  waveHeight: { decimals: 1, suffix: ' m' },
};

export function formatParameterValue(parameter: string, value: number): string {
  if (Number.isNaN(value)) return MISSING_VALUE_TEXT;
  const rule = PARAMETER_DISPLAY_RULES[parameter];
  if (!rule) return String(value);
  return value.toFixed(rule.decimals) + rule.suffix;
}

export function formatWind(speedKnots: number, directionDegrees: number): string {
  if (Number.isNaN(speedKnots) || Number.isNaN(directionDegrees)) return MISSING_VALUE_TEXT;
  return `${speedKnots.toFixed(0)} kt / ${directionDegrees.toFixed(0)}°`;
}
