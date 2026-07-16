import { BitmapLayer } from '@deck.gl/layers';
import type { Layer as DeckLayer } from '@deck.gl/core';
import { Control, PercentControl, percent } from '../../utils/controls';
import { Grid } from '../../objects/grid';
import { Provider } from '../../objects/provider';
import { ColorScale, ColorStop, colorScale, PaletteStyle } from '../../utils/color-scale';
import { MercatorBand } from '../../utils/geo';
import { Look, LookKind } from '../base/look';

export class Colormap extends Look<Grid> {
  readonly kind = LookKind.Colormap;
  readonly opacity: PercentControl;
  override readonly controls: Control[];
  private readonly scale: ColorScale;
  private last?: { grid: Grid; image: ImageData } = undefined;

  constructor(
    provider: Provider<Grid>,
    palette: ColorStop[],
    paletteStyle: PaletteStyle,
    opacity = 0.6,
  ) {
    super(provider);
    this.scale = colorScale(palette, paletteStyle);
    this.opacity = percent(opacity);
    this.controls = [this.opacity];
  }

  deckLayer(id: string, grid: Grid): DeckLayer {
    return new BitmapLayer({
      id,
      image: this.image(grid),
      bounds: grid.bounds,
      opacity: this.opacity(),
    });
  }

  private image(grid: Grid, resolution = 1024): ImageData {
    if (this.last && this.last.grid === grid) return this.last.image;
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
        const value = grid.valueAt(lon, lat, 'bilinear');
        if (Number.isNaN(value)) continue;
        const color = this.scale(value);
        const offset = (row * width + col) * 4;
        rgba[offset] = color.r;
        rgba[offset + 1] = color.g;
        rgba[offset + 2] = color.b;
        rgba[offset + 3] = 255;
      }
    }
    this.last = { grid, image: new ImageData(rgba, width, height) };
    return this.last.image;
  }
}
