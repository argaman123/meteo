import { HttpResourceRequest } from '@angular/common/http';
import { Look } from '../engine/base/look';
import { Grid } from '../objects/grid';
import { TimeWindow } from '../services/time-service';
import { Parameter } from '../types/parameter';
import { Bounds, Wrap } from '../types/wrap';

export interface Inputs {
  bbox(): Bounds | null;
  time(): number;
}

export abstract class Layer {
  abstract readonly parameters: Parameter[];
  abstract readonly looks: Look<unknown>[];
  readonly timeWindow: TimeWindow = { backHours: 24, forwardHours: 96, stepHours: 3 };

  request(parameter: Parameter, on: Inputs): HttpResourceRequest | undefined {
    const bbox = on.bbox();
    if (!bbox) return undefined;
    return {
      url: '/api/grids',
      params: {
        parameter,
        model: 'wide',
        time: String(on.time()),
        bbox: bbox.join(','),
      },
    };
  }

  parse(wraps: Wrap[]): Grid[] {
    return wraps.map((wrap) => Grid.fromWrap(wrap));
  }
}
