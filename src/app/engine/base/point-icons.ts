import { Look } from './look';
import { IconOverlay, IconScaling, Overlay, Sprite } from './overlay';

export abstract class PointIcons<P extends { lon: number; lat: number }> extends Look<{
  points: P[];
}> {
  protected abstract readonly size: number;

  protected abstract spriteOf(point: P): Sprite;

  buildLook(input: { points: P[] }): Overlay[] {
    return [
      new IconOverlay(
        input.points.map((point) => ({
          position: [point.lon, point.lat],
          sprite: this.spriteOf(point),
          size: this.size,
          angle: 0,
          opacity: 1,
        })),
        IconScaling.Pixels,
      ),
    ];
  }
}
