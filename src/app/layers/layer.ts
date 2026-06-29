import { HttpResourceRequest } from '@angular/common/http';
import { Look } from '../engine/looks/look';
import { Grid } from '../objects/grid';
import { Bounds, Wrap } from '../types/wrap';

export interface Inputs {
  bbox(): Bounds | null;
}

export abstract class Layer {
  abstract readonly id: string;
  abstract readonly label: string;
  abstract readonly parameter: string;
  abstract readonly looks: Look[];

  request(on: Inputs): HttpResourceRequest | undefined {
    const bbox = on.bbox();
    if (!bbox) return undefined;
    return {
      url: '/api/grids',
      params: {
        parameter: this.parameter,
        model: 'wide',
        time: String(Math.floor(Date.now() / 1000)),
        bbox: bbox.join(','),
      },
    };
  }

  parse(raw: Wrap): Grid {
    return new Grid(raw);
  }
}
