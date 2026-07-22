import { rgb, RGBColor } from 'd3-color';
import { interpolateLab } from 'd3-interpolate';
import { scaleLinear, scaleThreshold } from 'd3-scale';

export interface ColorStop {
  value: number;
  color: string;
}

export type PaletteStyle = 'smooth' | 'stepped';

export type ColorScale = (value: number) => RGBColor;

export function rgba(color: string, alpha = 255): [number, number, number, number] {
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
  const scale =
    style === 'stepped'
      ? scaleThreshold<number, string>().domain(stops.slice(1)).range(colors)
      : scaleLinear<string>().domain(stops).range(colors).interpolate(interpolateLab).clamp(true);
  return (value) => rgb(scale(value));
}
