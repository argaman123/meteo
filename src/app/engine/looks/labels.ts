import { Signal, computed } from '@angular/core';
import { Provider } from '../../objects/provider';
import { Legend, LookKind } from '../base/look';
import { PointIcon, PointIcons } from '../base/point-icons';
import { MAP_FONT, OUTLINE_COLOR } from '../map-service';

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
      create: () => createLabel(text, 16, 500, color, `${OUTLINE_COLOR}e6`, 3),
    };
  }
}

export function createLabel(
  text: string,
  fontSize: number,
  fontWeight: number,
  color: string,
  outlineColor: string,
  outlineWidth: number,
): HTMLCanvasElement {
  const scale = 2;
  const height = (fontSize + 6) * scale;
  const canvas = document.createElement('canvas');
  canvas.height = height;
  const context = canvas.getContext('2d')!;
  const font = `${fontWeight} ${fontSize * scale}px ${MAP_FONT}`;
  context.font = font;
  const width = Math.ceil(context.measureText(text).width + 8 * scale);
  canvas.width = width;
  context.font = font;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.strokeStyle = outlineColor;
  context.lineWidth = outlineWidth * scale;
  context.strokeText(text, width / 2, height / 2 + scale * 0.5);
  context.fillStyle = color;
  context.fillText(text, width / 2, height / 2 + scale * 0.5);
  return canvas;
}
