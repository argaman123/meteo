import type { Layer as DeckLayer } from '@deck.gl/core';
import { Provider } from '../../objects/provider';

export abstract class Look<I> {
  constructor(readonly provider: Provider<I>) {}
  abstract deckLayer(id: string, input: I): DeckLayer | DeckLayer[];
}
