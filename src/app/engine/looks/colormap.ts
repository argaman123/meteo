import { BitmapLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import { Grid } from '../../objects/grid';
import { ColorScale, ColorStop, colorScale, PaletteStyle } from '../../utils/color-scale';
import { inverseMercatorY, mercatorY } from '../../utils/mercator';
import { Look } from './look';

export class Colormap extends Look {
  private readonly scale: ColorScale;

  constructor(
    palette: ColorStop[],
    paletteStyle: PaletteStyle,
    private opacity = 0.6,
  ) {
    super();
    this.scale = colorScale(palette, paletteStyle);
  }

  deckLayer(id: string, grid: Grid): Layer {
    return new BitmapLayer({
      id,
      image: this.image(grid),
      bounds: grid.bounds,
      opacity: this.opacity,
    });
  }

  private image(grid: Grid, resolution = 1024): ImageData {
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
        const color = this.scale(value);
        const offset = (row * width + col) * 4;
        rgba[offset] = color.r;
        rgba[offset + 1] = color.g;
        rgba[offset + 2] = color.b;
        rgba[offset + 3] = 255;
      }
    }
    return new ImageData(rgba, width, height);
  }
}
