import { HttpResourceRequest, httpResource } from '@angular/common/http';
import { Injector, Signal, computed, signal } from '@angular/core';
import { Grid } from '../../objects/grid';
import { Parameter } from '../../types/parameter';
import { Wrap } from '../../types/wrap';
import { Inputs, Layer } from '../base/layer';

export abstract class ModelLayer extends Layer<Grid[]> {
  abstract readonly parameters: Parameter[];
  override readonly timeWindow = { backHours: 24, forwardHours: 96, stepHours: 3 }
  readonly model = signal('wide');

  fetch(on: Inputs, injector: Injector): Signal<Grid[] | undefined> {
    const grids = this.parameters.map(
      (parameter) =>
        httpResource(() => this.request(parameter, on), {
          injector,
          parse: (wrap) => Grid.fromWrap(wrap as Wrap),
        }).value,
    );
    return computed(() => {
      const loaded = grids.map((grid) => grid());
      if (loaded.some((grid) => grid === undefined)) return undefined;
      return loaded as Grid[];
    });
  }

  private request(parameter: Parameter, on: Inputs): HttpResourceRequest | undefined {
    const bbox = on.bbox();
    if (!bbox) return undefined;
    return {
      url: '/api/grids',
      params: {
        parameter,
        model: this.model(),
        time: String(on.time()),
        bbox: bbox.join(','),
      },
    };
  }
}
