import { rgb, RGBColor } from 'd3-color';
import { interpolateLab } from 'd3-interpolate';
import { scaleLinear, scaleThreshold } from 'd3-scale';
import { Grid } from '../../objects/grid';
import { inverseMercatorY, mercatorY } from '../../utils/mercator';

export interface ColorStop {
  value: number;
  color: string;
}

export type PaletteStyle = 'smooth' | 'stepped';

export type ColorScale = (value: number) => RGBColor;

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

export function colormapImage(grid: Grid, scale: ColorScale, resolution = 1024): ImageData {
  const aspect = grid.width / grid.height;
  const width = Math.max(2, Math.round(aspect >= 1 ? resolution : resolution * aspect));
  const height = Math.max(2, Math.round(aspect >= 1 ? resolution / aspect : resolution));
  const [west, south, east, north] = grid.bounds;
  const yNorth = mercatorY(north);
  const ySouth = mercatorY(south);
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row++) {
    const lat = inverseMercatorY(yNorth + ((ySouth - yNorth) * row) / (height - 1));
    for (let col = 0; col < width; col++) {
      const lon = west + ((east - west) * col) / (width - 1);
      const value = grid.valueAt(lon, lat, 'bilinear');
      if (Number.isNaN(value)) continue;
      const color = scale(value);
      const offset = (row * width + col) * 4;
      rgba[offset] = color.r;
      rgba[offset + 1] = color.g;
      rgba[offset + 2] = color.b;
      rgba[offset + 3] = 255;
    }
  }
  return new ImageData(rgba, width, height);
}
