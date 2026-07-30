import { HttpResourceRequest, httpResource } from '@angular/common/http';
import { Injector, Signal, computed } from '@angular/core';
import { Grid } from '../../objects/grid';
import { TimeRange } from '../../services/time-service';
import { Parameter } from '../../types/parameter';
import { Bounds, Wrap } from '../../types/wrap';
import { containsBounds } from '../../utils/geo';
import { Inputs, Layer } from '../base/layer';

const LOCAL_COVERAGE: Bounds = [0, 24, 50, 52];

export abstract class ModelLayer extends Layer<Grid[]> {
  abstract readonly parameters: Parameter[];
  override readonly timeWindow = { backHours: 24, forwardHours: 96, stepHours: 1 };

  relevanceOf(grids: Grid[]): TimeRange {
    const relevanceSeconds = 1.5 * 3600;
    return { start: grids[0].info.forecastTime - relevanceSeconds, end: grids[0].info.forecastTime + relevanceSeconds };
  }

  fetch(on: Inputs, injector: Injector): Signal<Grid[] | null | undefined> {
    const grids = this.parameters.map((parameter) =>
      httpResource(() => this.request(parameter, on), {
        injector,
        parse: (wrap) => Grid.fromWrap(wrap as Wrap),
      }),
    );
    return computed(() => {
      if (grids.some((grid) => grid.status() === 'error')) return null;
      if (grids.some((grid) => !grid.hasValue())) return undefined;
      return grids.map((grid) => grid.value()) as Grid[];
    });
  }

  private request(parameter: Parameter, on: Inputs): HttpResourceRequest | undefined {
    const bbox = on.bbox();
    if (!bbox) return undefined;
    return {
      url: '/api/grids',
      params: {
        parameter,
        model: containsBounds(LOCAL_COVERAGE, bbox) ? 'local' : 'wide',
        time: String(on.time()),
        bbox: bbox.join(','),
      },
    };
  }
}
