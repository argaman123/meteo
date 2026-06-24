import { HttpResourceRequest } from '@angular/common/http';
import { Look } from '../engine/looks/look';
import { Grid } from '../objects/grid';
import { Bounds, Wrap } from '../types/wrap';

export abstract class Layer {
  abstract readonly id: string;
  abstract readonly label: string;
  abstract readonly parameter: string;
  abstract readonly looks: Look[];

  request(bbox: Bounds, time: number): HttpResourceRequest {
    return {
      url: '/api/grids',
      params: {
        parameter: this.parameter,
        model: 'wide',
        time: String(time),
        bbox: bbox.join(','),
      },
    };
  }

  parse(raw: Wrap): Grid {
    return new Grid(raw);
  }
}
