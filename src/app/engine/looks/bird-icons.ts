import { Signal } from '@angular/core';
import { Provider } from '../../objects/provider';
import { Legend, LookKind } from '../base/look';
import { PointIcon, PointIcons } from '../base/point-icons';

export interface BirdIconsInput {
  points: { lon: number; lat: number; color: string }[];
}

export class BirdIcons extends PointIcons<BirdIconsInput['points'][number]> {
  readonly kind = LookKind.Points;
  protected readonly size = 16;

  constructor(
    provider: Provider<BirdIconsInput>,
    override readonly legend: Signal<Legend | null>,
  ) {
    super(provider);
  }

  protected iconOf({ color }: BirdIconsInput['points'][number]): PointIcon {
    return {
      key: color,
      paint: () => {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext('2d')!;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.beginPath();
        context.moveTo(4, 14);
        context.quadraticCurveTo(10, 9, 16, 18);
        context.quadraticCurveTo(22, 9, 28, 14);
        context.strokeStyle = 'rgb(15 23 42 / 90%)';
        context.lineWidth = 6.5;
        context.stroke();
        context.strokeStyle = color;
        context.lineWidth = 3;
        context.stroke();
        return canvas;
      },
    };
  }
}
