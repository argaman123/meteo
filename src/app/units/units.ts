export enum Unit {
  Celsius = 'celsius',
  MetersPerSecond = 'meters-per-second',
  Knots = 'knots',
  MetDegrees = 'met-degrees',
}

export enum Quantity {
  Temperature = 'temperature',
  WindSpeed = 'wind-speed',
  Direction = 'direction',
}

const displayUnit: Record<Quantity, Unit> = {
  [Quantity.Temperature]: Unit.Celsius,
  [Quantity.WindSpeed]: Unit.Knots,
  [Quantity.Direction]: Unit.MetDegrees,
};

const knotsPerMeterPerSecond = 1.943844;

export function convert(value: number, quantity: Quantity, from: Unit): number {
  const to = displayUnit[quantity];
  if (from === to) return value;
  if (from === Unit.MetersPerSecond && to === Unit.Knots) return value * knotsPerMeterPerSecond;
  if (from === Unit.Knots && to === Unit.MetersPerSecond) return value / knotsPerMeterPerSecond;
  throw new Error(`no conversion from ${from} to ${to}`);
}

export function format(value: number, quantity: Quantity, from: Unit): string {
  if (Number.isNaN(value)) return '—';
  const rounded = Math.round(convert(value, quantity, from));
  switch (displayUnit[quantity]) {
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
