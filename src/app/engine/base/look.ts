import type { Layer as DeckLayer } from '@deck.gl/core';
import { Provider } from '../../objects/provider';
import { Control } from '../../utils/controls';

export enum LookKind {
  Image,
  Colormap,
  Contours,
  Particles,
  Polygons,
  Icons,
  Text,
}

export abstract class Look<I> {
  abstract readonly kind: LookKind;
  readonly controls: Control[] = [];
  constructor(readonly provider: Provider<I>) {}
  abstract deckLayer(id: string, input: I): DeckLayer | DeckLayer[];
}
