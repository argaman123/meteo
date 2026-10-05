import { Signal, signal } from '@angular/core';
import type { Layer as DeckLayer } from '@deck.gl/core';
import { BitmapLayer, PathLayer } from '@deck.gl/layers';
import { Grid } from '../../objects/grid';
import { Provider } from '../../objects/provider';
import { Bounds } from '../../types/wrap';
import { ColorScale, ColorStop, colorScale, rgba } from '../../utils/color-scale';
import { Control, PercentControl, percent, toggle } from '../../utils/controls';
import { basemapBright } from '../map-service';
import { Legend, LegendStop, LegendType, Look, LookKind } from '../base/look';
import { ColormapOptions, buildImage } from './colormap';

export class Radar extends Look<Grid[]> {
  readonly kind = LookKind.Radar;
  readonly opacity: PercentControl = percent(0.85);
  readonly circle = toggle(true, 'עיגול');
  readonly noise: Signal<boolean>;
  override readonly controls: Control[];
  override readonly legend: Signal<Legend>;
  private readonly colorScale: ColorScale;
  private readonly noiseColorScale: ColorScale = (value) => this.colorScale(Math.abs(value));
  private readonly filterValue: (value: number) => boolean;
  private readonly noiseFilterValue: (value: number) => boolean;
  private readonly blur: boolean;
  private images = new Map<Grid, ImageData>();
  private imagesShowNoise = false;

  constructor(
    provider: Provider<Grid[]>,
    palette: (ColorStop & LegendStop)[],
    minimumValue = -Infinity,
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
    this.colorScale = colorScale(palette, 'stepped');
    this.filterValue = (value) => value >= minimumValue;
    this.noiseFilterValue = (value) => Math.abs(value) >= minimumValue;
    this.blur = options.blur ?? true;
  }

  override release(): void {
    this.images.clear();
  }

  deckLayer(id: string, grids: Grid[]): DeckLayer | DeckLayer[] {
    const showNoise = this.noise();
    if (showNoise !== this.imagesShowNoise) {
      this.images.clear();
      this.imagesShowNoise = showNoise;
    }
    const cache = new Map<Grid, ImageData>();
    const layers: DeckLayer[] = grids.map((grid, index) => {
      const image =
        this.images.get(grid) ??
        buildImage(
          grid,
          showNoise ? this.noiseColorScale : this.colorScale,
          'nearest',
          showNoise ? this.noiseFilterValue : this.filterValue,
          this.blur,
        );
      cache.set(grid, image);
      return new BitmapLayer({
        id: `${id}-${index}`,
        image,
        bounds: grid.bounds,
        opacity: this.opacity(),
      });
    });
    this.images = cache;
    if (this.circle()) {
      layers.push(
        new PathLayer<Bounds>({
          id: `${id}-circles`,
          data: grids.map((grid) => grid.bounds),
          getPath: (bounds) => coverageRing(bounds),
          getColor: basemapBright() ? rgba('#212429', 160) : rgba('#94a3b8', 140),
          getWidth: 1.5,
          widthUnits: 'pixels',
        }),
      );
    }
    return layers;
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
