import type { Layer as DeckLayer } from '@deck.gl/core';
import { IconLayer } from '@deck.gl/layers';
import { Look } from './look';
import { SpriteCache } from './sprite-cache';

export interface PointIcon {
  key: string;
  create: () => HTMLCanvasElement;
}

export abstract class PointIcons<P extends { lon: number; lat: number }> extends Look<{
  points: P[];
}> {
  protected abstract readonly size: number;
  private readonly sprites = new SpriteCache();

  protected abstract iconOf(point: P): PointIcon;

  override release(): void {
    this.sprites.clear();
  }

  deckLayer(id: string, input: { points: P[] }): DeckLayer {
    return new IconLayer<P>({
      id,
      data: input.points,
      getPosition: (point) => [point.lon, point.lat],
      getIcon: (point) => {
        const icon = this.iconOf(point);
        return this.sprites.spriteOf(icon.key, icon.create);
      },
      getSize: this.size,
      sizeUnits: 'pixels',
    });
  }
}
