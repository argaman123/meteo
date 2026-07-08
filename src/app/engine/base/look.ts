import type { Layer as DeckLayer } from '@deck.gl/core';
import { Provider } from '../../objects/provider';

export enum LookKind {
  Image,
  Colormap,
  Particles,
  Contours,
  Polygons,
  Icons,
  Text,
}

export abstract class Look<I> {
  abstract readonly kind: LookKind;
  constructor(readonly provider: Provider<I>) {}
  abstract deckLayer(id: string, input: I): DeckLayer | DeckLayer[];
}
