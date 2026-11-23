import { HttpResourceRequest, httpResource } from '@angular/common/http';
import { Injector, Signal, computed } from '@angular/core';
import { Grid } from '../../objects/grid';
import { Level } from '../../services/level-service';
import { TimeRange } from '../../services/time-service';
import { Model, Parameter } from '../../types/parameter';
import { Bounds, ModelWrapInfo, Wrap } from '../../types/wrap';
import { contains, containsBounds } from '../../utils/geo';
import { hoursToMs, snapToStep } from '../../utils/time';
import { Quantity, Unit, format } from '../../utils/units';
import { Inputs, Layer } from '../base/layer';

export const LOCAL_COVERAGE: Bounds = [19, 19, 55, 46];

export function modelAtPoint(lon: number, lat: number): Model {
  return contains(LOCAL_COVERAGE, lon, lat) ? Model.Local : Model.Wide;
}

export abstract class ModelLayer extends Layer<Grid<ModelWrapInfo>[]> {
  abstract readonly parameters: Parameter[];
  protected abstract readonly quantity: Quantity;
  protected abstract readonly unit: Unit;
  override readonly staticLevel: boolean = false;
  protected readonly reduction: number | null = null;
  private readonly pressureStepHours = 3;
  private readonly fullResolutionPaddingDeg = 0.25;
  private readonly surfaceParameters: Partial<Record<Parameter, Parameter>> = {
    [Parameter.Temperature]: Parameter.SurfaceTemperature,
    [Parameter.RelativeHumidity]: Parameter.SurfaceRelativeHumidity,
  };

  protected readonly label = (value: number): string => format(value, this.quantity, this.unit);

  hover(grids: Grid[], lon: number, lat: number): string | null {
    const value = grids[0].valueAt(lon, lat, 'bilinear');
    return Number.isNaN(value) ? null : this.label(value);
  }

  relevanceOf(grids: Grid<ModelWrapInfo>[]): TimeRange {
    const relevanceMs = hoursToMs(1.5);
    return {
      start: grids[0].info.forecast_time - relevanceMs,
      end: grids[0].info.forecast_time + relevanceMs,
    };
  }

  fetch(on: Inputs, injector: Injector): Signal<Grid<ModelWrapInfo>[] | null | undefined> {
    const level = computed(() => this.levelOf(this.staticLevel ? null : on.level()));
    const grids = this.parameters.map((parameter) =>
      httpResource(() => this.request(parameter, on, level()), {
        injector,
        parse: (wrap) => Grid.fromWrap(wrap as Wrap<ModelWrapInfo>),
      }),
    );
    return computed(() => {
      if (level() === undefined) return null;
      if (grids.some((grid) => grid.status() === 'error')) return null;
      if (grids.some((grid) => !grid.hasValue())) return undefined;
      return grids.map((grid) => grid.value()) as Grid<ModelWrapInfo>[];
    });
  }

  protected levelOf(level: Level | null): Level | null | undefined {
    return level;
  }

  protected modelOf(bbox: Bounds): Model {
    return containsBounds(LOCAL_COVERAGE, bbox) ? Model.Local : Model.Wide;
  }

  private request(
    parameter: Parameter,
    on: Inputs,
    level: Level | null | undefined,
  ): HttpResourceRequest | undefined {
    const bbox = on.bbox();
    if (!bbox || level === undefined) return undefined;
    const [west, south, east, north] = bbox;
    const model = this.modelOf(bbox);
    const wireParameter = level === null ? (this.surfaceParameters[parameter] ?? parameter) : parameter;
    const modelTime = snapToStep(on.displayTime(), this.pressureStepHours);
    const padding = this.reduction === null ? 0 : this.fullResolutionPaddingDeg;
    return {
      url:
        typeof level === 'string'
          ? `/model/data-limited/${model}/${level === 'SFC' ? level : `MB${level}`}/${wireParameter}/${modelTime}/params`
          : `/model/data_with_flat_heights_with_limit/${model}/${level ?? 0}/${wireParameter}/${on.displayTime()}/params`,
      params: {
        min_lon: west - padding,
        min_lat: south - padding,
        max_lon: east + padding,
        max_lat: north + padding,
        ...(this.reduction === null ? {} : { reduction: this.reduction }),
      },
    };
  }
}
