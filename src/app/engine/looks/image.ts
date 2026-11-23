import { Bounds } from '../../types/wrap';
import { Control, percent } from '../../utils/controls';
import { MercatorBand } from '../../utils/geo';
import { Look, LookKind } from '../base/look';
import { ImageOverlay, Overlay } from '../base/overlay';

export interface ImageInput {
  image: ImageBitmap;
  bounds: Bounds;
}

export class Image extends Look<ImageInput> {
  readonly kind = LookKind.Image;
  readonly opacity = percent(1);
  override readonly controls: Control[] = [this.opacity];
  private last?: { input: ImageInput; canvas: HTMLCanvasElement } = undefined;

  override release(): void {
    this.last = undefined;
  }

  buildLook(input: ImageInput): Overlay[] {
    if (this.last?.input !== input) this.last = { input, canvas: this.createMercatorImage(input) };
    return [new ImageOverlay(this.last.canvas, input.bounds, this.opacity())];
  }

  private createMercatorImage({ image, bounds }: ImageInput): HTMLCanvasElement {
    const [, south, , north] = bounds;
    const band = new MercatorBand(north, south);
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d')!;
    for (let row = 0; row < image.height; row++) {
      const lat = band.latAt((row + 0.5) / image.height);
      const sourceRow = Math.min(image.height - 1, Math.max(0, Math.floor(((north - lat) / (north - south)) * image.height)));
      context.drawImage(image, 0, sourceRow, image.width, 1, 0, row, image.width, 1);
    }
    return canvas;
  }
}
