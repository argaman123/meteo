import { VectorField } from '../../objects/grid';
import { Look, LookKind } from './look';
import { Icon, IconOverlay, IconScaling, Overlay } from './overlay';
import { inkColor } from '../map-service';

export interface GridIcon {
  key: string;
  angle: number;
  draw: (context: CanvasRenderingContext2D) => void;
}

export abstract class GridIcons extends Look<VectorField> {
  readonly kind = LookKind.Icons;
  protected abstract readonly sizeFactor: number;

  protected abstract iconAt(eastward: number, northward: number, lat: number): GridIcon;

  buildLook({ u, v }: VectorField): Overlay[] {
    const ink = inkColor();
    const [west, south, east, north] = u.bounds;
    const stride = Math.max(1, Math.round(u.width / 35));
    const cellWidth = (east - west) / (u.width - 1);
    const cellHeight =
      (north - south) / (u.height - 1) / Math.cos((((north + south) / 2) * Math.PI) / 180);
    const size =
      (Math.min(stride * cellWidth, stride * cellHeight, (east - west) / 35) / 360) * 512 * this.sizeFactor;
    const icons: Icon[] = [];
    for (let row = 0; row < u.height; row += stride) {
      const lat = north - (row / (u.height - 1)) * (north - south);
      for (let column = 0; column < u.width; column += stride) {
        const eastward = u.data[row * u.width + column];
        const northward = v.data[row * u.width + column];
        if (Number.isNaN(eastward) || Number.isNaN(northward)) continue;
        const icon = this.iconAt(eastward, northward, lat);
        icons.push({
          position: [west + (column / (u.width - 1)) * (east - west), lat],
          sprite: { key: `${icon.key} ${ink}`, create: () => this.createIcon(icon, ink) },
          size,
          angle: icon.angle,
          opacity: 1,
        });
      }
    }
    return [new IconOverlay(icons, IconScaling.World)];
  }

  private createIcon(icon: GridIcon, ink: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d')!;
    context.fillStyle = ink;
    context.strokeStyle = ink;
    icon.draw(context);
    return canvas;
  }
}
