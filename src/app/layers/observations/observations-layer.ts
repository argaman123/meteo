import { HttpClient } from '@angular/common/http';
import { Injector, Signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Labels } from '../../engine/looks/labels';
import { Legend } from '../../engine/base/look';
import { Provider } from '../../objects/provider';
import { ObservationParam, ObservationPoint } from '../../types/observations';
import { Control, OptionsPresentation, options } from '../../utils/controls';
import { ColorScale } from '../../utils/color-scale';
import { nearestPoint } from '../../utils/geo';
import { minutesToMs, stepTimesBefore } from '../../utils/time';
import { Inputs } from '../base/layer';
import { FrameRequest, Loop, LoopLayer } from '../base/loop-layer';
import { CLOUD } from './cloud';
import { RAIN } from './rain';
import { TEMPERATURE } from './temperature';
import { WIND } from './wind';

export interface Observation {
  lon: number;
  lat: number;
  params: ObservationParam[];
}

interface ObservationsFrame {
  time: number;
  points: Observation[];
}

export type ObservationsLoop = Loop<ObservationsFrame>;

export interface ObservationParameter {
  parameter: string;
  label: string;
  colorScale: ColorScale;
  legend: Signal<Legend>;
  valueOf: (point: Observation) => number;
  textOf: (point: Observation) => string;
}

export function paramValue(point: Observation, name: string): number {
  return Number(point.params.find((param) => param.name === name)?.value ?? NaN);
}

export class ObservationsLayer extends LoopLayer<ObservationsFrame> {
  readonly name = 'תצפיות';
  override readonly timeWindow = { backHours: 24, forwardHours: 0, stepHours: 1 };
  protected readonly loopMinutes = 60;
  private readonly stepMinutes = 10;
  private readonly parameters = [TEMPERATURE, WIND, RAIN, CLOUD];
  readonly parameter = options<string>(
    'TMP',
    this.parameters.map(({ parameter, label }) => ({ value: parameter, label })),
    'פרמטר',
    OptionsPresentation.Select,
  );
  override readonly controls: Control[] = [this.parameter];
  private readonly currentParameter = computed(
    () =>
      this.parameters.find(({ parameter }) => parameter === this.parameter()) ?? this.parameters[0],
  );
  readonly looks = [
    {
      look: new Labels(
        new Provider((loops: ObservationsLoop[]) => {
          const { colorScale, valueOf, textOf } = this.currentParameter();
          const points = loops.flatMap((loop) => loop.shown.points);
          return {
            points: points.map((point) => {
              return {
                lon: point.lon,
                lat: point.lat,
                text: textOf(point),
                color: colorScale(valueOf(point)).formatHex(),
              };
            }),
          };
        }),
        () => this.currentParameter().legend(),
      ),
      name: 'ערכים',
      checked: true,
    },
  ];

  hover(loops: ObservationsLoop[], lon: number, lat: number): string | null {
    const points = loops.flatMap((loop) => loop.shown.points);
    const nearest = nearestPoint(points, lon, lat, 0.35);
    return nearest ? this.currentParameter().textOf(nearest) : null;
  }

  protected frameRequests(
    on: Inputs,
    injector: Injector,
  ): Signal<FrameRequest<ObservationsFrame>[]> {
    const http = injector.get(HttpClient);
    return computed(() =>
      stepTimesBefore(
        on.exactTime(),
        minutesToMs(this.loopMinutes),
        minutesToMs(this.stepMinutes),
      ).map((time) => this.obsRequest(http, this.parameter(), time)),
    );
  }

  private obsRequest(
    http: HttpClient,
    parameter: string,
    time: number,
  ): FrameRequest<ObservationsFrame> {
    const request: Record<string, string> = {
      start: String(time - minutesToMs(this.loopMinutes)),
      end: String(time),
      param: parameter,
      cache: 'false',
    };
    return {
      params: request,
      load: () =>
        firstValueFrom(
          http.get<ObservationPoint[]>('/observations/getDataByParam', { params: request }),
        ).then((points) => [
          {
            time,
            points: points.map(({ coords: [[lon, lat]], params }) => ({ lon, lat, params })),
          },
        ]),
    };
  }
}
