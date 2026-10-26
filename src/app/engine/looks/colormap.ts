import { Signal, computed, signal } from '@angular/core';
import { Control, PercentControl, percent } from '../../utils/controls';
import { Grid } from '../../objects/grid';
import { Provider } from '../../objects/provider';
import { Palette } from '../../utils/color-scale';
import { BackgroundResult, buildImageInBackground } from '../base/background';
import { Legend, LegendType, Look, LookKind } from '../base/look';
import { ImageOverlay, Overlay } from '../base/overlay';

export interface ColormapOptions {
  opacity?: number;
  interpolation?: 'bilinear' | 'nearest';
  blur?: boolean;
  legend?: Legend;
}

export class Colormap extends Look<Grid> {
  readonly kind: LookKind = LookKind.Colormap;
  readonly opacity: PercentControl;
  override readonly controls: Control[];
  override readonly legend: Signal<Legend>;
  private readonly images: BackgroundResult<Grid, ImageData>;

  constructor(
    provider: Provider<Grid>,
    palette: Palette,
    label: (value: number) => string,
    options: ColormapOptions = {},
  ) {
    super(provider);
    const interpolation = options.interpolation ?? 'bilinear';
    const blur = options.blur ?? false;
    this.images = new BackgroundResult((grid: Grid) =>
      buildImageInBackground(grid, palette.stops, palette.style, interpolation, -Infinity, false, blur),
    );
    this.opacity = percent(options.opacity ?? 0.6);
    this.controls = [this.opacity];
    this.legend = options.legend
      ? signal(options.legend)
      : computed(() => ({
          type: LegendType.Gradient,
          stops: palette.stops.map((stop) => ({ color: stop.color, label: label(stop.value) })),
        }));
  }

  override release(): void {
    this.images.clear();
  }

  buildLook(grid: Grid): Overlay[] {
    const image = this.images.requestResult(grid);
    return image ? [new ImageOverlay(image.output, image.input.bounds, this.opacity())] : [];
  }
}
