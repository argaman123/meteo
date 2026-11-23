import { Signal, signal } from '@angular/core';
import { Grid } from '../../objects/grid';
import { Provider } from '../../objects/provider';
import { Bounds } from '../../types/wrap';
import { ColorStop, rgba } from '../../utils/color-scale';
import { Control, PercentControl, percent, toggle } from '../../utils/controls';
import { basemapBright } from '../map-service';
import { BackgroundResult, buildImageInBackground } from '../base/background';
import { Legend, LegendStop, LegendType, Look, LookKind } from '../base/look';
import { ImageOverlay, LineOverlay, Overlay } from '../base/overlay';
import { ColormapOptions } from './colormap';

export class Radar extends Look<Grid[]> {
  readonly kind = LookKind.Radar;
  readonly opacity: PercentControl = percent(0.85);
  readonly circle = toggle(true, 'עיגול');
  readonly noise: Signal<boolean>;
  override readonly controls: Control[];
  override readonly legend: Signal<Legend>;
  private readonly blur: boolean;
  private readonly imagesPerRadar: BackgroundResult<Grid, ImageData>[] = [];
  private imagesShowNoise = false;

  constructor(
    provider: Provider<Grid[]>,
    private readonly palette: (ColorStop & LegendStop)[],
    private readonly minimumValue = -Infinity,
    options: Pick<ColormapOptions, 'blur'> & { noise?: boolean } = {},
  ) {
    super(provider);
    if (options.noise === undefined) {
      const noise = toggle(false, 'רעש');
      this.noise = noise;
      this.controls = [this.opacity, this.circle, noise];
    } else {
      this.noise = signal(options.noise);
      this.controls = [this.opacity, this.circle];
    }
    this.legend = signal({ type: LegendType.Swatches, stops: palette });
    this.blur = options.blur ?? true;
  }

  override release(): void {
    for (const images of this.imagesPerRadar) images.clear();
    this.imagesPerRadar.length = 0;
  }

  buildLook(grids: Grid[]): Overlay[] {
    const showNoise = this.noise();
    if (showNoise !== this.imagesShowNoise) {
      this.release();
      this.imagesShowNoise = showNoise;
    }
    const overlays: Overlay[] = grids.flatMap((grid, index) => {
      this.imagesPerRadar[index] ??= new BackgroundResult((radarGrid: Grid) =>
        buildImageInBackground(radarGrid, this.palette, 'stepped', 'nearest', this.minimumValue, showNoise, this.blur),
      );
      const image = this.imagesPerRadar[index].requestResult(grid);
      return image ? [new ImageOverlay(image.output, image.input.bounds, this.opacity())] : [];
    });
    if (this.circle()) {
      const color = basemapBright() ? rgba('#212429', 160) : rgba('#94a3b8', 140);
      overlays.push(
        new LineOverlay(grids.map((grid) => ({ path: coverageRing(grid.bounds), color, width: 1.5 }))),
      );
    }
    return overlays;
  }
}

function coverageRing(bounds: Bounds): [number, number][] {
  const [west, south, east, north] = bounds;
  const centerLon = (west + east) / 2;
  const centerLat = (south + north) / 2;
  const radiusLon = (east - west) / 2;
  const radiusLat = (north - south) / 2;
  const ring: [number, number][] = [];
  for (let i = 0; i <= 72; i++) {
    const angle = (i / 72) * 2 * Math.PI;
    ring.push([centerLon + radiusLon * Math.cos(angle), centerLat + radiusLat * Math.sin(angle)]);
  }
  return ring;
}
