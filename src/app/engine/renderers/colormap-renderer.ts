import type { Layer } from '@deck.gl/core';
import { BitmapLayer } from '@deck.gl/layers';
import { ColorStop, ValueRange } from '../../layers/look';
import { Grid } from '../../objects/grid';
import { inverseMercatorY, mercatorY } from './mercator';

export interface ColormapRender {
  id: string;
  grid: Grid;
  palette: ColorStop[];
  paletteStyle: 'smooth' | 'stepped';
  interpolation: 'bilinear' | 'nearest';
  visibleRange?: ValueRange;
  opacity: number;
}

const colorizedImages = new WeakMap<Grid, { textureCap: number; image: ImageData }>();

export function renderColormapLayer(render: ColormapRender, textureCap: number): Layer {
  return new BitmapLayer({
    id: render.id,
    image: colorizeGrid(render, textureCap),
    bounds: render.grid.bounds,
    opacity: render.opacity,
  });
}

function colorizeGrid(render: ColormapRender, textureCap: number): ImageData {
  const grid = render.grid;
  const cached = colorizedImages.get(grid);
  if (cached && cached.textureCap === textureCap) return cached.image;
  const width = Math.max(2, Math.min(Math.max(grid.width * 8, 512), textureCap));
  const height = Math.max(2, Math.min(Math.max(grid.height * 8, 512), textureCap));
  const [west, south, east, north] = grid.bounds;
  const latitudes = mercatorLatitudes(north, south, height);
  const rgba = new Uint8ClampedArray(width * height * 4);
  const visibleRange = render.visibleRange;
  for (let row = 0; row < height; row++) {
    const lat = latitudes[row];
    for (let col = 0; col < width; col++) {
      const lon = west + ((east - west) * col) / (width - 1);
      const value = grid.valueAt(lon, lat, render.interpolation);
      if (
        Number.isNaN(value) ||
        (visibleRange && (value < visibleRange.min || value > visibleRange.max))
      ) {
        continue;
      }
      const offset = (row * width + col) * 4;
      const [r, g, b, a] = paletteRgba(value, render.palette, render.paletteStyle);
      rgba[offset] = r;
      rgba[offset + 1] = g;
      rgba[offset + 2] = b;
      rgba[offset + 3] = a;
    }
  }
  const image = new ImageData(rgba, width, height);
  colorizedImages.set(grid, { textureCap, image });
  return image;
}

function mercatorLatitudes(north: number, south: number, rows: number): number[] {
  const yNorth = mercatorY(north);
  const ySouth = mercatorY(south);
  const latitudes: number[] = [];
  for (let row = 0; row < rows; row++) {
    const y = yNorth + ((ySouth - yNorth) * row) / (rows - 1);
    latitudes.push(inverseMercatorY(y));
  }
  return latitudes;
}

function paletteRgba(
  value: number,
  palette: ColorStop[],
  style: 'smooth' | 'stepped',
): [number, number, number, number] {
  if (value <= palette[0].value) return hexRgba(palette[0].color);
  const last = palette[palette.length - 1];
  if (value >= last.value) return hexRgba(last.color);
  let upper = 1;
  while (palette[upper].value < value) upper++;
  const below = palette[upper - 1];
  const above = palette[upper];
  if (style === 'stepped') return hexRgba(value >= above.value ? above.color : below.color);
  const fraction = (value - below.value) / (above.value - below.value);
  const [r0, g0, b0] = hexRgba(below.color);
  const [r1, g1, b1] = hexRgba(above.color);
  return [
    Math.round(r0 + (r1 - r0) * fraction),
    Math.round(g0 + (g1 - g0) * fraction),
    Math.round(b0 + (b1 - b0) * fraction),
    255,
  ];
}

function hexRgba(hex: string): [number, number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
    255,
  ];
}
