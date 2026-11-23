import { rgb, RGBColor } from 'd3-color';
import { interpolateLab } from 'd3-interpolate';
import { scaleLinear, scaleThreshold } from 'd3-scale';
import { clampToRange } from './time';

export interface ColorStop {
  value: number;
  color: string;
}

export type PaletteStyle = 'smooth' | 'stepped';

export interface Palette {
  stops: ColorStop[];
  style: PaletteStyle;
}

export type ColorScale = (value: number) => RGBColor;

export type Rgba = [number, number, number, number];

export function rgba(color: string, alpha = 255): Rgba {
  const parsed = rgb(color);
  return [parsed.r, parsed.g, parsed.b, alpha];
}

export function colorScale(
  palette: ColorStop[],
  style: PaletteStyle,
  domain?: [number, number],
): ColorScale {
  const colors = palette.map((stop) => stop.color);
  const stops = domain
    ? colors.map((_, i) => domain[0] + ((domain[1] - domain[0]) * i) / (colors.length - 1))
    : palette.map((stop) => stop.value);
  if (style === 'stepped') {
    const scale = scaleThreshold<number, string>().domain(stops.slice(1)).range(colors);
    const parsed = new Map(colors.map((color) => [color, rgb(color)]));
    return (value) => parsed.get(scale(value)) ?? rgb(scale(value));
  }
  const scale = scaleLinear<string>().domain(stops).range(colors).interpolate(interpolateLab).clamp(true);
  const low = stops[0];
  const span = stops[stops.length - 1] - low;
  const steps = 2048;
  const table = Array.from({ length: steps + 1 }, (_, index) => rgb(scale(low + (span * index) / steps)));
  return (value) =>
    Number.isNaN(value) ? rgb(scale(value)) : table[Math.round(clampToRange((value - low) / span, 0, 1) * steps)];
}
