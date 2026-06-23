import type { Layer } from '@deck.gl/core';
import { Grid } from '../../objects/grid';

export abstract class Look {
  abstract deckLayer(id: string, grid: Grid): Layer;
}
