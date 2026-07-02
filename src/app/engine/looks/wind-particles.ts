import { CompositeLayer, UpdateParameters } from '@deck.gl/core';
import type { Layer as DeckLayer } from '@deck.gl/core';
import { LineLayer, LineLayerProps } from '@deck.gl/layers';
import { Grid } from '../../objects/grid';
import { Bounds } from '../../types/wrap';
import { Look } from './look';

export interface WindField {
  u: Grid;
  v: Grid;
}

export class WindParticles extends Look<WindField> {
  deckLayer(id: string, field: WindField): DeckLayer {
    return new WindParticleLayer({ id, ...field });
  }
}

class ParticleField {
  readonly heads = new Float32Array(1500 * 2);
  readonly tails = new Float32Array(1500 * 2);
  private readonly lon = new Float32Array(1500);
  private readonly lat = new Float32Array(1500);
  private readonly bounds: Bounds;

  constructor(
    private readonly u: Grid,
    private readonly v: Grid,
  ) {
    this.bounds = u.bounds;
    for (let i = 0; i < this.count; i++) this.spawn(i);
  }

  get count(): number {
    return this.lon.length;
  }

  advance(): void {
    const { lon, lat, heads, tails } = this;
    const [west, south, east, north] = this.bounds;
    const span = east - west;
    for (let i = 0; i < lon.length; i++) {
      const u = this.u.valueAt(lon[i], lat[i], 'nearest');
      const v = this.v.valueAt(lon[i], lat[i], 'nearest');
      const nextLon = lon[i] + u * span * 0.00015;
      const nextLat = lat[i] + v * span * 0.00015;
      const outside = nextLon < west || nextLon > east || nextLat < south || nextLat > north;
      if (Number.isNaN(u) || outside || Math.random() < 0.01) {
        this.spawn(i);
        continue;
      }
      lon[i] = nextLon;
      lat[i] = nextLat;
      heads[i * 2] = nextLon;
      heads[i * 2 + 1] = nextLat;
      tails[i * 2] = nextLon - u * span * 0.004;
      tails[i * 2 + 1] = nextLat - v * span * 0.004;
    }
  }

  private spawn(i: number): void {
    const { lon, lat, heads, tails } = this;
    const [west, south, east, north] = this.bounds;
    const newLon = west + Math.random() * (east - west);
    const newLat = south + Math.random() * (north - south);
    lon[i] = newLon;
    lat[i] = newLat;
    heads[i * 2] = newLon;
    heads[i * 2 + 1] = newLat;
    tails[i * 2] = newLon;
    tails[i * 2 + 1] = newLat;
  }
}

interface State {
  [key: string]: unknown;
  raf: number;
  tick: number;
  field: ParticleField;
}

class WindParticleLayer extends CompositeLayer<WindField> {
  static override layerName = 'WindParticleLayer';
  declare state: State;

  override initializeState(): void {
    this.setState({ tick: 0, field: new ParticleField(this.props.u, this.props.v) });
    this.state.raf = requestAnimationFrame(this.animate);
  }

  override updateState({ props, oldProps }: UpdateParameters<this>): void {
    if (props.u !== oldProps.u || props.v !== oldProps.v) {
      this.setState({ field: new ParticleField(props.u, props.v) });
    }
  }

  override finalizeState(): void {
    cancelAnimationFrame(this.state.raf);
  }

  override renderLayers(): DeckLayer {
    const { field } = this.state;
    const data = {
      length: field.count,
      attributes: {
        getSourcePosition: { value: field.heads, size: 2 },
        getTargetPosition: { value: field.tails, size: 2 },
      },
    } as unknown as LineLayerProps['data'];
    return new LineLayer(this.getSubLayerProps({ id: 'streaks' }), {
      data,
      getColor: [255, 255, 255],
      getWidth: 1.5,
      widthUnits: 'pixels',
      opacity: 0.8,
    });
  }

  private animate = (): void => {
    this.state.field.advance();
    this.setState({ tick: this.state.tick + 1 });
    this.state.raf = requestAnimationFrame(this.animate);
  };
}
