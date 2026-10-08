import type { Layer as DeckLayer } from '@deck.gl/core';
import { IconLayer } from '@deck.gl/layers';
import { VectorField } from '../../objects/grid';
import { rgba } from '../../utils/color-scale';
import { AnimatedLayer, AnimatedState } from '../base/animated-layer';
import { Look, LookKind } from '../base/look';
import { inkColor } from '../map-service';

export class WaveCrests extends Look<VectorField> {
  readonly kind = LookKind.Particles;

  deckLayer(id: string, field: VectorField): DeckLayer {
    return new WaveCrestLayer({ id, ...field });
  }
}

interface Crest {
  position: [number, number];
  velocity: [number, number];
  bearing: number;
  size: number;
  age: number;
  life: number;
  shown: boolean;
}

interface State extends AnimatedState {
  field: VectorField;
  crests: Crest[];
  icon: string;
}

class WaveCrestLayer extends AnimatedLayer<VectorField> {
  static override layerName = 'WaveCrestLayer';
  declare state: State;
  private readonly columns = 40;
  private readonly rows = 30;

  rebuild(): void {
    const field = { u: this.props.u, v: this.props.v };
    const crests = Array.from({ length: this.columns * this.rows }, (_, slot) =>
      this.spawn(field, slot),
    );
    for (const crest of crests) crest.age = Math.random() * crest.life;
    this.setState({ field, crests, icon: this.state.icon ?? crestIcon() });
  }

  override renderLayers(): DeckLayer {
    const ink = inkColor();
    const { tick } = this.state;
    return new IconLayer<Crest>(this.getSubLayerProps({ id: 'crests' }), {
      data: this.state.crests,
      getPosition: (crest) => crest.position,
      getIcon: () => ({
        url: this.state.icon,
        width: 64,
        height: 32,
        anchorX: 32,
        anchorY: 16,
        mask: true,
      }),
      getAngle: (crest) => -crest.bearing,
      getSize: (crest) => crest.size,
      getColor: (crest) =>
        rgba(ink, crest.shown ? Math.round(160 * Math.sin((Math.PI * crest.age) / crest.life)) : 0),
      sizeUnits: 'pixels',
      updateTriggers: { getPosition: tick, getAngle: tick, getSize: tick, getColor: [tick, ink] },
    });
  }

  step(deltaSeconds: number): void {
    const { field, crests } = this.state;
    crests.forEach((crest, index) => {
      crest.age += deltaSeconds;
      crest.position = [
        crest.position[0] + crest.velocity[0] * deltaSeconds,
        crest.position[1] + crest.velocity[1] * deltaSeconds,
      ];
      const [lon, lat] = crest.position;
      if (Number.isNaN(field.u.valueAt(lon, lat, 'nearest'))) crest.shown = false;
      if (crest.age >= crest.life) crests[index] = this.spawn(field, index);
    });
  }

  private spawn({ u, v }: VectorField, slot: number): Crest {
    const [west, south, east, north] = u.bounds;
    const lon = west + (((slot % this.columns) + Math.random()) / this.columns) * (east - west);
    const lat =
      south + ((Math.floor(slot / this.columns) + Math.random()) / this.rows) * (north - south);
    const eastward = u.valueAt(lon, lat, 'bilinear');
    const northward = v.valueAt(lon, lat, 'bilinear');
    const length = Math.hypot(eastward, northward);
    const speed = 0.008 * (east - west);
    return {
      position: [lon, lat],
      velocity: [
        (eastward / length) * speed || 0,
        (northward / length) * speed * Math.cos((lat * Math.PI) / 180) || 0,
      ],
      bearing: (Math.atan2(eastward, northward) * 180) / Math.PI,
      size: 7 + (9 * Math.min(length, 4)) / 4,
      age: 0,
      life: 2 + Math.random() * 2,
      shown: length > 0,
    };
  }
}

function crestIcon(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 32;
  const context = canvas.getContext('2d')!;
  context.strokeStyle = '#ffffff';
  context.lineWidth = 3;
  context.lineCap = 'round';
  context.beginPath();
  context.arc(32, 70, 60, Math.PI * 1.33, Math.PI * 1.67);
  context.stroke();
  return canvas.toDataURL();
}
