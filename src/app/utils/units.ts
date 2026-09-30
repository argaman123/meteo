import { unitControls } from '../pages/home/settings-panel/settings-controls';

export enum Unit {
  Celsius = 'celsius',
  MetersPerSecond = 'meters-per-second',
  Knots = 'knots',
  MetDegrees = 'met-degrees',
  Meters = 'meters',
  Kilometers = 'kilometers',
  MillimetersPerHour = 'millimeters-per-hour',
  Millimeters = 'millimeters',
  Eighths = 'eighths',
  Feet = 'feet',
  Kilofeet = 'kilofeet',
  Millibars = 'millibars',
  Percent = 'percent',
}

export enum Quantity {
  Temperature = 'temperature',
  WindSpeed = 'wind-speed',
  Direction = 'direction',
  GeopotentialHeight = 'geopotential-height',
  Visibility = 'visibility',
  Rain = 'rain',
  Precipitation = 'precipitation',
  CloudCover = 'cloud-cover',
  CloudBase = 'cloud-base',
  Altitude = 'altitude',
  Height = 'height',
  Pressure = 'pressure',
  RelativeHumidity = 'relative-humidity',
  WaveHeight = 'wave-height',
}

const displayUnit: Record<Quantity, Unit> = {
  [Quantity.Temperature]: Unit.Celsius,
  [Quantity.WindSpeed]: Unit.Knots,
  [Quantity.Direction]: Unit.MetDegrees,
  [Quantity.GeopotentialHeight]: Unit.Meters,
  [Quantity.Visibility]: Unit.Kilometers,
  [Quantity.Rain]: Unit.MillimetersPerHour,
  [Quantity.Precipitation]: Unit.Millimeters,
  [Quantity.CloudCover]: Unit.Eighths,
  [Quantity.CloudBase]: Unit.Kilofeet,
  [Quantity.Altitude]: Unit.Feet,
  [Quantity.Height]: Unit.Kilofeet,
  [Quantity.Pressure]: Unit.Millibars,
  [Quantity.RelativeHumidity]: Unit.Percent,
  [Quantity.WaveHeight]: Unit.Meters,
};

function displayUnitOf(quantity: Quantity): Unit {
  return unitControls[quantity]?.() ?? displayUnit[quantity];
}

const knotsPerMeterPerSecond = 1.943844;
const feetPerMeter = 3.28084;

export function convert(value: number, quantity: Quantity, from: Unit): number {
  return convertBetween(value, from, displayUnitOf(quantity));
}

export function convertBetween(value: number, from: Unit, to: Unit): number {
  if (from === to) return value;
  if (from === Unit.MetersPerSecond && to === Unit.Knots) return value * knotsPerMeterPerSecond;
  if (from === Unit.Knots && to === Unit.MetersPerSecond) return value / knotsPerMeterPerSecond;
  if (from === Unit.Feet && to === Unit.Kilofeet) return value / 1000;
  if (from === Unit.Kilofeet && to === Unit.Feet) return value * 1000;
  if (from === Unit.Meters && to === Unit.Feet) return value * feetPerMeter;
  if (from === Unit.Feet && to === Unit.Meters) return value / feetPerMeter;
  if (from === Unit.Meters && to === Unit.Kilofeet) return (value * feetPerMeter) / 1000;
  throw new Error(`no conversion from ${from} to ${to}`);
}

const unitsWrittenTight = new Set([
  Unit.Celsius,
  Unit.MetDegrees,
  Unit.Kilometers,
  Unit.Eighths,
  Unit.Kilofeet,
  Unit.Millibars,
  Unit.Percent,
]);

export function format(value: number, quantity: Quantity, from: Unit): string {
  const number = formatNumber(value, quantity, from);
  if (Number.isNaN(value)) return number;
  const separator = unitsWrittenTight.has(displayUnitOf(quantity)) ? '' : ' ';
  return `${number}${separator}${unitLabel(quantity)}`;
}

export function formatNumber(value: number, quantity: Quantity, from: Unit): string {
  if (Number.isNaN(value)) return '—';
  const converted = convert(value, quantity, from);
  switch (displayUnitOf(quantity)) {
    case Unit.Kilometers:
    case Unit.MillimetersPerHour:
    case Unit.Millimeters:
    case Unit.Kilofeet:
      return `${Number(converted.toFixed(1))}`;
    case Unit.Meters:
      return quantity === Quantity.WaveHeight ? `${Number(converted.toFixed(1))}` : `${Math.round(converted)}`;
    case Unit.MetDegrees:
      return `${(Math.round(converted) + 360) % 360}`;
    default:
      return `${Math.round(converted)}`;
  }
}

export function formatSignedNumber(value: number, quantity: Quantity, from: Unit): string {
  const number = formatNumber(value, quantity, from);
  return convert(value, quantity, from) >= 0.5 ? `+${number}` : number;
}

export function unitLabel(quantity: Quantity): string {
  switch (displayUnitOf(quantity)) {
    case Unit.Celsius:
      return '°C';
    case Unit.Knots:
      return 'kt';
    case Unit.MetersPerSecond:
      return 'm/s';
    case Unit.MetDegrees:
      return '°';
    case Unit.Meters:
      return 'm';
    case Unit.Kilometers:
      return 'km';
    case Unit.MillimetersPerHour:
      return 'mm/h';
    case Unit.Millimeters:
      return 'mm';
    case Unit.Eighths:
      return '/8';
    case Unit.Feet:
      return quantity === Quantity.Altitude ? 'רגל מעפ״י' : 'ft';
    case Unit.Kilofeet:
      return "'";
    case Unit.Millibars:
      return 'mb';
    case Unit.Percent:
      return '%';
  }
}
