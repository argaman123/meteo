import { Signal, computed } from '@angular/core';
import { Provider } from '../../objects/provider';
import { Legend, LookKind } from '../base/look';
import { PointIcon, PointIcons } from '../base/point-icons';

export interface LabelsInput {
  points: { lon: number; lat: number; text: string; color: string }[];
}

export class Labels extends PointIcons<LabelsInput['points'][number]> {
  readonly kind = LookKind.Points;
  protected readonly size = 22;

  override readonly legend: Signal<Legend | null>;

  constructor(provider: Provider<LabelsInput>, legendOf: () => Legend | null = () => null) {
    super(provider);
    this.legend = computed(legendOf);
  }

  protected iconOf({ text, color }: LabelsInput['points'][number]): PointIcon {
    return {
      key: `${color} ${text}`,
      paint: () => {
        const scale = 2;
        const height = 22 * scale;
        const canvas = document.createElement('canvas');
        canvas.height = height;
        const context = canvas.getContext('2d')!;
        const font = `500 ${16 * scale}px 'Source Sans 3', 'Heebo', sans-serif`;
        context.font = font;
        const width = Math.ceil(context.measureText(text).width + 8 * scale);
        canvas.width = width;
        context.font = font;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.lineJoin = 'round';
        context.strokeStyle = 'rgb(15 23 42 / 90%)';
        context.lineWidth = 3 * scale;
        context.strokeText(text, width / 2, height / 2 + scale * 0.5);
        context.fillStyle = color;
        context.fillText(text, width / 2, height / 2 + scale * 0.5);
        return canvas;
      },
    };
  }
}
