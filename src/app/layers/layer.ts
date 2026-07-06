import { HttpResourceRequest } from '@angular/common/http';
import { Look } from '../engine/base/look';
import { Grid } from '../objects/grid';
import { Parameter } from '../types/parameter';
import { Bounds, Wrap } from '../types/wrap';

export interface Inputs {
  bbox(): Bounds | null;
}

export abstract class Layer {
  abstract readonly parameters: Parameter[];
  abstract readonly looks: Look<unknown>[];

  request(parameter: Parameter, on: Inputs): HttpResourceRequest | undefined {
    const bbox = on.bbox();
    if (!bbox) return undefined;
    return {
      url: '/api/grids',
      params: {
        parameter,
        model: 'wide',
        time: String(Math.floor(Date.now() / 1000)),
        bbox: bbox.join(','),
      },
    };
  }

  parse(wraps: Wrap[]): Grid[] {
    return wraps.map((wrap) => Grid.fromWrap(wrap));
  }
}
