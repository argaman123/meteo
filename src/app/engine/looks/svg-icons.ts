import { Signal, signal } from '@angular/core';
import { Provider } from '../../objects/provider';
import { Legend, Look, LookKind } from '../base/look';
import { IconOverlay, IconScaling, Overlay } from '../base/overlay';
import { OUTLINE_COLOR } from '../map-service';

interface IconPoint {
  lon: number;
  lat: number;
  color: string;
}

export interface SvgIconsInput {
  points: IconPoint[];
}

export class SvgIcons extends Look<SvgIconsInput> {
  readonly kind = LookKind.Points;
  private readonly loaded = signal(0);
  private readonly outline: HTMLImageElement;
  private readonly fill: HTMLImageElement;

  constructor(
    provider: Provider<SvgIconsInput>,
    icon: string,
    private readonly size: number,
    override readonly legend: Signal<Legend | null>,
  ) {
    super(provider);
    this.outline = this.loadIcon(`${icon}-outline`);
    this.fill = this.loadIcon(icon);
  }

  buildLook(input: SvgIconsInput): Overlay[] {
    if (this.loaded() < 2) return [];
    return [
      new IconOverlay(
        input.points.map((point) => ({
          position: [point.lon, point.lat],
          sprite: { key: point.color, create: () => this.createIcon(point.color) },
          size: this.size,
          angle: 0,
          opacity: 1,
        })),
        IconScaling.Pixels,
      ),
    ];
  }

  private createIcon(color: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d')!;
    context.drawImage(this.tinted(this.outline, OUTLINE_COLOR), 0, 0);
    context.drawImage(this.tinted(this.fill, color), 0, 0);
    return canvas;
  }

  private tinted(image: HTMLImageElement, color: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0, 64, 64);
    context.globalCompositeOperation = 'source-in';
    context.fillStyle = color;
    context.fillRect(0, 0, 64, 64);
    return canvas;
  }

  private loadIcon(name: string): HTMLImageElement {
    const image = new window.Image(64, 64);
    image.onload = () => this.loaded.update((count) => count + 1);
    image.src = `icons/${name}.svg`;
    return image;
  }
}
