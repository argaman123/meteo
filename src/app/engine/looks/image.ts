import { COORDINATE_SYSTEM, type Layer as DeckLayer } from '@deck.gl/core';
import { BitmapLayer } from '@deck.gl/layers';
import { Bounds } from '../../types/wrap';
import { Control, percent } from '../../utils/controls';
import { Look, LookKind } from '../base/look';

export interface ImageInput {
  image: ImageBitmap;
  bounds: Bounds;
}

export class Image extends Look<ImageInput> {
  readonly kind = LookKind.Image;
  readonly opacity = percent(1);
  override readonly controls: Control[] = [this.opacity];

  deckLayer(id: string, input: ImageInput): DeckLayer {
    return new BitmapLayer({
      id,
      image: input.image,
      bounds: input.bounds,
      _imageCoordinateSystem: COORDINATE_SYSTEM.LNGLAT,
      opacity: this.opacity(),
    });
  }
}
