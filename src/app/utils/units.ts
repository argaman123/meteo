export enum Unit {
  Celsius = 'celsius',
  MetersPerSecond = 'meters-per-second',
  Knots = 'knots',
  MetDegrees = 'met-degrees',
  Meters = 'meters',
  Kilometers = 'kilometers',
  MillimetersPerHour = 'millimeters-per-hour',
  Eighths = 'eighths',
  Feet = 'feet',
  Kilofeet = 'kilofeet',
}

export enum Quantity {
  Temperature = 'temperature',
  WindSpeed = 'wind-speed',
  Direction = 'direction',
  GeopotentialHeight = 'geopotential-height',
  Visibility = 'visibility',
  Rain = 'rain',
  CloudCover = 'cloud-cover',
  CloudBase = 'cloud-base',
  Altitude = 'altitude',
}

const displayUnit: Record<Quantity, Unit> = {
  [Quantity.Temperature]: Unit.Celsius,
  [Quantity.WindSpeed]: Unit.Knots,
  [Quantity.Direction]: Unit.MetDegrees,
  [Quantity.GeopotentialHeight]: Unit.Meters,
  [Quantity.Visibility]: Unit.Kilometers,
  [Quantity.Rain]: Unit.MillimetersPerHour,
  [Quantity.CloudCover]: Unit.Eighths,
  [Quantity.CloudBase]: Unit.Kilofeet,
  [Quantity.Altitude]: Unit.Feet,
};

const knotsPerMeterPerSecond = 1.943844;

export function convert(value: number, quantity: Quantity, from: Unit): number {
  const to = displayUnit[quantity];
  if (from === to) return value;
  if (from === Unit.MetersPerSecond && to === Unit.Knots) return value * knotsPerMeterPerSecond;
  if (from === Unit.Knots && to === Unit.MetersPerSecond) return value / knotsPerMeterPerSecond;
  if (from === Unit.Feet && to === Unit.Kilofeet) return value / 1000;
  if (from === Unit.Kilofeet && to === Unit.Feet) return value * 1000;
  throw new Error(`no conversion from ${from} to ${to}`);
}

export function format(value: number, quantity: Quantity, from: Unit): string {
  if (Number.isNaN(value)) return '—';
  const converted = convert(value, quantity, from);
  const rounded = Math.round(converted);
  switch (displayUnit[quantity]) {
    case Unit.Celsius:
      return `${rounded}°C`;
    case Unit.Knots:
      return `${rounded} kt`;
    case Unit.MetersPerSecond:
      return `${rounded} m/s`;
    case Unit.MetDegrees:
      return `${(rounded + 360) % 360}°`;
    case Unit.Meters:
      return `${rounded} m`;
    case Unit.Kilometers:
      return `${Number(converted.toFixed(1))}km`;
    case Unit.MillimetersPerHour:
      return `${Number(converted.toFixed(1))} mm/h`;
    case Unit.Eighths:
      return `${rounded}/8`;
    case Unit.Feet:
      return `${rounded} רגל מעפ״י`;
    case Unit.Kilofeet:
      return `${Number(converted.toFixed(1))}'`;
  }
}
