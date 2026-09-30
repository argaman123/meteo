import type { Layer as DeckLayer } from '@deck.gl/core';
import { IconLayer } from '@deck.gl/layers';
import { VectorField } from '../../objects/grid';
import { basemapBright } from '../map-service';
import { LabelIcon, Look, LookKind } from './look';

export interface GridIcon {
  key: string;
  angle: number;
  draw: (context: CanvasRenderingContext2D) => void;
}

interface PlacedIcon {
  position: [number, number];
  icon: GridIcon;
}

export abstract class GridIcons extends Look<VectorField> {
  readonly kind = LookKind.Icons;
  protected abstract readonly sizeFactor: number;
  private readonly icons = new Map<string, LabelIcon>();

  protected abstract iconAt(eastward: number, northward: number, lat: number): GridIcon;

  override release(): void {
    this.icons.clear();
  }

  deckLayer(id: string, { u, v }: VectorField): DeckLayer {
    const ink = basemapBright() ? '#212429' : '#ffffff';
    const [west, south, east, north] = u.bounds;
    const stride = Math.max(1, Math.round(u.width / 35));
    const cellWidth = (east - west) / (u.width - 1);
    const cellHeight =
      (north - south) / (u.height - 1) / Math.cos((((north + south) / 2) * Math.PI) / 180);
    const placed: PlacedIcon[] = [];
    for (let row = 0; row < u.height; row += stride) {
      const lat = north - (row / (u.height - 1)) * (north - south);
      for (let column = 0; column < u.width; column += stride) {
        const eastward = u.data[row * u.width + column];
        const northward = v.data[row * u.width + column];
        if (Number.isNaN(eastward) || Number.isNaN(northward)) continue;
        placed.push({
          position: [west + (column / (u.width - 1)) * (east - west), lat],
          icon: this.iconAt(eastward, northward, lat),
        });
      }
    }
    return new IconLayer<PlacedIcon>({
      id,
      data: placed,
      getPosition: (point) => point.position,
      getIcon: (point) => this.rendered(point.icon, ink),
      getAngle: (point) => -point.icon.angle,
      getSize:
        (Math.min(stride * cellWidth, stride * cellHeight, (east - west) / 35) / 360) *
        512 *
        this.sizeFactor,
      sizeUnits: 'common',
      updateTriggers: { getIcon: ink },
    });
  }

  private rendered(icon: GridIcon, ink: string): LabelIcon {
    const key = `${icon.key} ${ink}`;
    const cached = this.icons.get(key);
    if (cached) return cached;
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d')!;
    context.fillStyle = ink;
    context.strokeStyle = ink;
    icon.draw(context);
    const rendered = {
      url: canvas.toDataURL(),
      width: size,
      height: size,
      anchorX: size / 2,
      anchorY: size / 2,
    };
    this.icons.set(key, rendered);
    return rendered;
  }
}
