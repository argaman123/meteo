import { BitmapLayer } from '@deck.gl/layers';
import type { Layer as DeckLayer } from '@deck.gl/core';
import { Control, PercentControl, percent } from '../../utils/controls';
import { Grid } from '../../objects/grid';
import { Provider } from '../../objects/provider';
import { ColorScale, Palette, colorScale } from '../../utils/color-scale';
import { MercatorBand } from '../../utils/geo';
import { Legend, LegendType, Look, LookKind } from '../base/look';

export interface ColormapOptions {
  opacity?: number;
  interpolation?: 'bilinear' | 'nearest';
  filterValue?: (value: number) => boolean;
  blur?: boolean;
  legend?: Legend;
}

export class Colormap extends Look<Grid> {
  readonly kind: LookKind = LookKind.Colormap;
  readonly opacity: PercentControl;
  override readonly controls: Control[];
  override readonly legend: Legend;
  private readonly scale: ColorScale;
  private readonly interpolation: 'bilinear' | 'nearest';
  private readonly filterValue?: (value: number) => boolean;
  private readonly blur: boolean;
  private last?: { grid: Grid; image: ImageData } = undefined;

  constructor(
    provider: Provider<Grid>,
    palette: Palette,
    label: (value: number) => string,
    options: ColormapOptions = {},
  ) {
    super(provider);
    this.scale = colorScale(palette.stops, palette.style);
    this.interpolation = options.interpolation ?? 'bilinear';
    this.filterValue = options.filterValue;
    this.blur = options.blur ?? false;
    this.opacity = percent(options.opacity ?? 0.6);
    this.controls = [this.opacity];
    this.legend = options.legend ?? {
      type: LegendType.Gradient,
      stops: palette.stops.map((stop) => ({ color: stop.color, label: label(stop.value) })),
    };
  }

  override release(): void {
    this.last = undefined;
  }

  deckLayer(id: string, grid: Grid): DeckLayer | DeckLayer[] {
    if (!this.last || this.last.grid !== grid) {
      const image = buildImage(
        grid,
        this.scale,
        this.interpolation,
        this.filterValue,
        this.blur,
      );
      this.last = { grid, image };
    }
    return new BitmapLayer({
      id,
      image: this.last.image,
      bounds: grid.bounds,
      opacity: this.opacity(),
    });
  }
}

export function buildImage(
  grid: Grid,
  scale: ColorScale,
  interpolation: 'bilinear' | 'nearest',
  filterValue: ((value: number) => boolean) | undefined,
  blur: boolean,
): ImageData {
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
      const value = grid.valueAt(lon, lat, interpolation);
      if (Number.isNaN(value)) continue;
      if (filterValue && !filterValue(value)) continue;
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
