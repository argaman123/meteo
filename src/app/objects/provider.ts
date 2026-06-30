import { Grid } from './grid';

export class Provider<I> {
  constructor(private fn: (grids: Grid[]) => I) {}

  provide(grids: Grid[]): I {
    return this.fn(grids);
  }
}
