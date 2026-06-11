import type { Layer } from '@deck.gl/core';
import { BitmapLayer } from '@deck.gl/layers';
import { ColorStop, ColormapLayerDefinition } from '../../layers/layer-definition';
import { FieldGrid } from '../../types/field-grid';

const colorizedImages = new WeakMap<FieldGrid, { textureCap: number; image: ImageData }>();

export function renderColormapLayer(
  definition: ColormapLayerDefinition,
  textureCap: number,
): Layer {
  return new BitmapLayer({
    id: definition.entry.id,
    image: colorizeGrid(definition, textureCap),
    bounds: definition.grid.bounds,
    opacity: definition.opacity,
  });
}

function colorizeGrid(definition: ColormapLayerDefinition, textureCap: number): ImageData {
  const grid = definition.grid;
  const cached = colorizedImages.get(grid);
  if (cached && cached.textureCap === textureCap) return cached.image;
  const width = Math.max(2, Math.min(grid.width * 6, textureCap));
  const height = Math.max(2, Math.min(grid.height * 6, textureCap));
  const [west, south, east, north] = grid.bounds;
  const latitudes = mercatorLatitudes(north, south, height);
  const rgba = new Uint8ClampedArray(width * height * 4);
  const visibleRange = definition.entry.visibleRange;
  for (let row = 0; row < height; row++) {
    const lat = latitudes[row];
    for (let col = 0; col < width; col++) {
      const lon = west + ((east - west) * col) / (width - 1);
      const value = sampleNearMissing(grid, lon, lat);
      if (
        Number.isNaN(value) ||
        (visibleRange && (value < visibleRange.min || value > visibleRange.max))
      ) {
        continue;
      }
      const offset = (row * width + col) * 4;
      const [r, g, b, a] = paletteRgba(
        value,
        definition.entry.palette,
        definition.entry.paletteStyle,
      );
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

function sampleNearMissing(grid: FieldGrid, lon: number, lat: number): number {
  const [west, south, east, north] = grid.bounds;
  const col = ((lon - west) / (east - west)) * (grid.width - 1);
  const row = ((north - lat) / (north - south)) * (grid.height - 1);
  if (col < 0 || row < 0 || col > grid.width - 1 || row > grid.height - 1) return NaN;
  const nearest = grid.data[Math.round(row) * grid.width + Math.round(col)];
  if (Number.isNaN(nearest)) return NaN;
  const c0 = Math.floor(col);
  const r0 = Math.floor(row);
  const c1 = Math.min(c0 + 1, grid.width - 1);
  const r1 = Math.min(r0 + 1, grid.height - 1);
  const fc = col - c0;
  const fr = row - r0;
  const corners = [
    grid.data[r0 * grid.width + c0],
    grid.data[r0 * grid.width + c1],
    grid.data[r1 * grid.width + c0],
    grid.data[r1 * grid.width + c1],
  ];
  const weights = [(1 - fc) * (1 - fr), fc * (1 - fr), (1 - fc) * fr, fc * fr];
  let sum = 0;
  let weightSum = 0;
  for (let i = 0; i < 4; i++) {
    if (Number.isNaN(corners[i])) continue;
    sum += corners[i] * weights[i];
    weightSum += weights[i];
  }
  return weightSum > 0 ? sum / weightSum : NaN;
}

export function mercatorLatitudes(north: number, south: number, rows: number): number[] {
  const yNorth = mercatorY(north);
  const ySouth = mercatorY(south);
  const latitudes: number[] = [];
  for (let row = 0; row < rows; row++) {
    const y = yNorth + ((ySouth - yNorth) * row) / (rows - 1);
    latitudes.push(inverseMercatorY(y));
  }
  return latitudes;
}

function mercatorY(latitudeDegrees: number): number {
  const radians = (latitudeDegrees * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + radians / 2));
}

function inverseMercatorY(y: number): number {
  return ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI;
}

export function paletteRgba(
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
