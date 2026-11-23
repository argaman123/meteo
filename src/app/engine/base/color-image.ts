import { Grid } from '../../objects/grid';
import { ColorStop, PaletteStyle, colorScale } from '../../utils/color-scale';
import { MercatorBand } from '../../utils/geo';

// TODO: UNVERIFIED CODE BELOW
export function buildImage(
  grid: Grid,
  palette: ColorStop[],
  style: PaletteStyle,
  interpolation: 'bilinear' | 'nearest',
  minimumValue: number,
  absolute: boolean,
  blur: boolean,
): ImageData {
  const scale = colorScale(palette, style);
  const resolution =
    interpolation === 'nearest' ? Math.min(1024, Math.max(grid.width, grid.height) * 4) : 1024;
  const aspect = grid.width / grid.height;
  const width = Math.max(2, Math.round(aspect >= 1 ? resolution : resolution * aspect));
  const height = Math.max(2, Math.round(aspect >= 1 ? resolution / aspect : resolution));
  const [west, south, east, north] = grid.bounds;
  const band = new MercatorBand(north, south);
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row++) {
    const lat = band.latAt(row / (height - 1));
    for (let col = 0; col < width; col++) {
      const lon = west + ((east - west) * col) / (width - 1);
      const sampled = grid.valueAt(lon, lat, interpolation);
      if (Number.isNaN(sampled)) continue;
      const value = absolute ? Math.abs(sampled) : sampled;
      if (value < minimumValue) continue;
      const color = scale(value);
      const offset = (row * width + col) * 4;
      rgba[offset] = color.r;
      rgba[offset + 1] = color.g;
      rgba[offset + 2] = color.b;
      rgba[offset + 3] = 255;
    }
  }
  const image = new ImageData(rgba, width, height);
  return blur ? blurred(image) : image;
}

function blurred(image: ImageData): ImageData {
  const source = new OffscreenCanvas(image.width, image.height);
  source.getContext('2d')!.putImageData(image, 0, 0);
  const context = new OffscreenCanvas(image.width, image.height).getContext('2d')!;
  context.filter = 'blur(2px)';
  context.drawImage(source, 0, 0);
  return context.getImageData(0, 0, image.width, image.height);
}
