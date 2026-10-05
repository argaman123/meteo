import type { Layer as DeckLayer } from '@deck.gl/core';
import { IconLayer } from '@deck.gl/layers';
import { LabelIcon, Look } from './look';

export interface PointIcon {
  key: string;
  paint: () => HTMLCanvasElement;
}

export abstract class PointIcons<P extends { lon: number; lat: number }> extends Look<{
  points: P[];
}> {
  protected abstract readonly size: number;
  private readonly icons = new Map<string, LabelIcon>();

  protected abstract iconOf(point: P): PointIcon;

  override release(): void {
    this.icons.clear();
  }

  deckLayer(id: string, input: { points: P[] }): DeckLayer {
    return new IconLayer<P>({
      id,
      data: input.points,
      getPosition: (point) => [point.lon, point.lat],
      getIcon: (point) => this.rendered(this.iconOf(point)),
      getSize: this.size,
      sizeUnits: 'pixels',
    });
  }

  private rendered(icon: PointIcon): LabelIcon {
    const cached = this.icons.get(icon.key);
    if (cached) return cached;
    const canvas = icon.paint();
    const rendered = {
      url: canvas.toDataURL(),
      width: canvas.width,
      height: canvas.height,
      anchorX: canvas.width / 2,
      anchorY: canvas.height / 2,
    };
    this.icons.set(icon.key, rendered);
    return rendered;
  }
}
