import { Signal, computed } from '@angular/core';
import type { Layer as DeckLayer } from '@deck.gl/core';
import { IconLayer } from '@deck.gl/layers';
import { Provider } from '../../objects/provider';
import { LabelIcon, Legend, Look, LookKind } from '../base/look';

export interface LabelsInput {
  points: { lon: number; lat: number; text: string; color: string }[];
}

export class Labels extends Look<LabelsInput> {
  readonly kind = LookKind.Text;
  private labelIcons = new Map<string, LabelIcon>();

  override readonly legend: Signal<Legend | null>;

  constructor(provider: Provider<LabelsInput>, legendOf: () => Legend | null = () => null) {
    super(provider);
    this.legend = computed(legendOf);
  }

  override release(): void {
    this.labelIcons.clear();
  }

  deckLayer(id: string, input: LabelsInput): DeckLayer | DeckLayer[] {
    return new IconLayer<LabelsInput['points'][number]>({
      id,
      data: input.points,
      getPosition: (point) => [point.lon, point.lat],
      getIcon: (point) => this.icon(point.text, point.color),
      getSize: 18,
      sizeUnits: 'pixels',
    });
  }

  private icon(text: string, color: string): LabelIcon {
    const key = `${color} ${text}`;
    const cached = this.labelIcons.get(key);
    if (cached) return cached;
    const scale = 2;
    const height = 18 * scale;
    const canvas = document.createElement('canvas');
    canvas.height = height;
    const context = canvas.getContext('2d')!;
    const font = `600 ${13 * scale}px 'Heebo Variable', sans-serif`;
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
    const icon = {
      url: canvas.toDataURL(),
      width,
      height,
      anchorX: width / 2,
      anchorY: height / 2,
    };
    this.labelIcons.set(key, icon);
    return icon;
  }
}
