import { HttpClient } from '@angular/common/http';
import { Injector, Resource, Signal, computed, resource } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Labels } from '../../engine/looks/labels';
import { Legend } from '../../engine/base/look';
import { Provider } from '../../objects/provider';
import { TimeRange } from '../../services/time-service';
import { ObservationPoint } from '../../types/observations';
import { sameArrays } from '../../utils/arrays';
import { Control, OptionsPresentation, options } from '../../utils/controls';
import { ColorScale } from '../../utils/color-scale';
import { findNearestByTime, minutesToMs } from '../../utils/time';
import { Inputs } from '../base/layer';
import { FrameLoader, LoopLayer } from '../base/loop-layer';
import { CLOUD } from './cloud';
import { RAIN } from './rain';
import { TEMPERATURE } from './temperature';
import { WIND } from './wind';

interface ObservationsFrame {
  time: number;
  points: ObservationPoint[];
}

export interface ObservationsLoop {
  frames: ObservationsFrame[];
  shown: ObservationsFrame;
}

export interface ObservationParameter {
  parameter: string;
  label: string;
  colorScale: ColorScale;
  legend: Signal<Legend>;
  valueOf: (point: ObservationPoint) => number;
  textOf: (point: ObservationPoint) => string;
}

export function paramValue(point: ObservationPoint, name: string): number {
  return point.params.find((param) => param.name === name)?.value ?? NaN;
}

export class ObservationsLayer extends LoopLayer<ObservationsLoop> {
  readonly name = 'תצפיות';
  override readonly timeWindow = { backHours: 24, forwardHours: 0, stepHours: 1 };
  private readonly askMinutes = 60;
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
        new Provider((loop: ObservationsLoop) => {
          const { colorScale, valueOf, textOf } = this.currentParameter();
          return {
            points: loop.shown.points.map((point) => {
              const { r, g, b } = colorScale(valueOf(point));
              const [lon, lat] = point.coords[0];
              return {
                lon,
                lat,
                text: textOf(point),
                color: `rgb(${r} ${g} ${b})`,
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

  hover(loop: ObservationsLoop, lon: number, lat: number): string {
    const { textOf } = this.currentParameter();
    let nearest: ObservationPoint | undefined = undefined;
    let best = 0.35;
    for (const point of loop.shown.points) {
      const [pointLon, pointLat] = point.coords[0];
      const distance = Math.hypot(pointLon - lon, pointLat - lat);
      if (distance < best) {
        best = distance;
        nearest = point;
      }
    }
    if (!nearest) return '—';
    return textOf(nearest);
  }

  loopTimesOf(loop: ObservationsLoop): number[] {
    return loop.frames.map((frame) => frame.time);
  }

  atTime(loop: ObservationsLoop, loopTime: number): ObservationsLoop {
    return { ...loop, shown: findNearestByTime(loop.frames, loopTime) };
  }

  relevanceOf(loop: ObservationsLoop): TimeRange {
    const times = loop.frames.map((frame) => frame.time);
    return {
      start: Math.min(...times) - minutesToMs(this.stepMinutes),
      end: Math.max(...times) + minutesToMs(this.askMinutes),
    };
  }

  fetch(on: Inputs, injector: Injector): Signal<ObservationsLoop | null | undefined> {
    const frames = this.framesResource(on, injector);
    return computed(() => {
      const loaded = frames.hasValue() ? frames.value() : undefined;
      if (loaded === undefined || loaded.length === 0) return undefined;
      return { frames: loaded, shown: loaded[loaded.length - 1] };
    });
  }

  private framesResource(
    on: Inputs,
    injector: Injector,
  ): Resource<ObservationsFrame[] | undefined> {
    const http = injector.get(HttpClient);
    const loader = new FrameLoader<ObservationsFrame>();
    return resource({
      params: this.requestParams(on),
      stream: async ({ params }) =>
        loader.stream(
          params.requestTimes.map((time) => this.obsRequest(http, params.parameter, time)),
        ),
      injector,
    });
  }

  private requestParams(on: Inputs) {
    const stepMs = minutesToMs(this.stepMinutes);
    return computed(
      () => {
        const newest = Math.floor(on.exactTime() / stepMs) * stepMs;
        const requestTimes: number[] = [];
        for (let time = newest - minutesToMs(this.askMinutes); time <= newest; time += stepMs) {
          requestTimes.push(time);
        }
        return { parameter: this.parameter(), requestTimes };
      },
      { equal: (a, b) => a.parameter === b.parameter && sameArrays(a.requestTimes, b.requestTimes) },
    );
  }

  private obsRequest(http: HttpClient, parameter: string, time: number) {
    const request: Record<string, string> = {
      start: String(time - minutesToMs(this.askMinutes)),
      end: String(time),
      param: parameter,
      cache: 'false',
    };
    return {
      params: request,
      load: () =>
        firstValueFrom(
          http.get<ObservationPoint[]>('/observations/getDataByParam', { params: request }),
        ).then((points) => ({ time, points })),
    };
  }

}
