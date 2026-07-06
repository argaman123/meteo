export enum Unit {
  Celsius = 'celsius',
  MetersPerSecond = 'meters-per-second',
  Knots = 'knots',
  MetDegrees = 'met-degrees',
}

const knotsPerMeterPerSecond = 1.943844;

export function convert(value: number, from: Unit, to: Unit): number {
  if (from === to) return value;
  if (from === Unit.MetersPerSecond && to === Unit.Knots) return value * knotsPerMeterPerSecond;
  if (from === Unit.Knots && to === Unit.MetersPerSecond) return value / knotsPerMeterPerSecond;
  throw new Error(`no conversion from ${from} to ${to}`);
}

export function format(value: number, unit: Unit): string {
  if (Number.isNaN(value)) return '—';
  const rounded = Math.round(value);
  switch (unit) {
    case Unit.Celsius:
      return `${rounded}°C`;
    case Unit.Knots:
      return `${rounded} kt`;
    case Unit.MetersPerSecond:
      return `${rounded} m/s`;
    case Unit.MetDegrees:
      return `${(rounded + 360) % 360}°`;
  }
}
