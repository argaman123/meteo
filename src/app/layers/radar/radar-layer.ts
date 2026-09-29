import { HttpClient, httpResource } from '@angular/common/http';
import { Injector, Resource, Signal, computed, resource } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Radar } from '../../engine/looks/radar';
import { Grid } from '../../objects/grid';
import { Provider } from '../../objects/provider';
import { TimeRange } from '../../services/time-service';
import { RadarEntity, RadarTimeRange } from '../../types/radar';
import { RadarWrapInfo, Wrap } from '../../types/wrap';
import { sameArrays } from '../../utils/arrays';
import { findNearestByTime, minutesToMs, msToSeconds, secondsToMs } from '../../utils/time';
import { Quantity, Unit, format } from '../../utils/units';
import { Inputs } from '../base/layer';
import { FrameLoader, LoopLayer } from '../base/loop-layer';

interface RadarFrame {
  name: string;
  time: number;
  map: Grid;
}

export interface RadarLoop {
  frames: RadarFrame[];
  shown: RadarFrame;
}

export class RadarLayer extends LoopLayer<RadarLoop[]> {
  readonly name = 'מכ"ם';
  override readonly timeWindow = { backHours: 24, forwardHours: 0, stepHours: 1 };
  private readonly askMinutes = 30;
  private readonly minimumRain = 0.1;
  private readonly radar = new Radar(
    new Provider((radars: RadarLoop[]) => radars.map((radar) => radar.shown.map)),
    this.minimumRain,
  );
  readonly looks = [
    {
      look: this.radar,
      name: 'גשם',
      checked: true,
    },
  ];

  hover(radars: RadarLoop[], lon: number, lat: number): string {
    const values = radars
      .map((radar) => radar.shown.map.valueAt(lon, lat, 'nearest'))
      .map((value) => (this.radar.noise() ? Math.abs(value) : value))
      .filter((value) => !Number.isNaN(value));
    const most = Math.max(...values);
    if (most < this.minimumRain) return '—';
    return format(most, Quantity.Rain, Unit.MillimetersPerHour);
  }

  relevanceOf(radars: RadarLoop[]): TimeRange {
    const times = radars.flatMap((radar) => radar.frames.map((frame) => frame.time));
    return {
      start: Math.min(...times) - minutesToMs(this.askMinutes),
      end: Math.max(...times) + minutesToMs(this.askMinutes),
    };
  }

  loopTimesOf(radars: RadarLoop[]): number[] {
    return radars.flatMap((radar) => radar.frames.map((frame) => frame.time));
  }

  atTime(radars: RadarLoop[], loopTime: number): RadarLoop[] {
    return radars.map((radar) => ({
      ...radar,
      shown: findNearestByTime(radar.frames, loopTime),
    }));
  }

  fetch(on: Inputs, injector: Injector): Signal<RadarLoop[] | null | undefined> {
    const entities = this.entitiesResource(on, injector);
    const frames = this.framesResource(injector, entities);
    return computed(() => {
      if (!frames.hasValue()) return undefined;
      const radars = this.loopsOf(frames.value());
      if (radars.length > 0) return radars;
      const expected = entities.hasValue() && entities.value().length > 0;
      return expected ? undefined : null;
    });
  }

  private loopsOf(frames: RadarFrame[]): RadarLoop[] {
    const radarNames = [...new Set(frames.map((frame) => frame.name))];
    return radarNames.map((name) => {
      const radarFrames = frames.filter((frame) => frame.name === name);
      return { frames: radarFrames, shown: radarFrames[radarFrames.length - 1] };
    });
  }

  private entitiesResource(on: Inputs, injector: Injector): Resource<RadarEntity[] | undefined> {
    return httpResource(
      () => ({
        url: '/radar/get_time_range_to_live_radars',
        params: {
          start: msToSeconds(on.exactTime() - minutesToMs(this.askMinutes)),
          end: msToSeconds(on.exactTime()),
        },
      }),
      {
        injector,
        parse: (timeRange) => {
          const byFileName = new Map<string, RadarEntity>();
          for (const entity of Object.values(timeRange as RadarTimeRange).flat()) {
            byFileName.set(entity.fileName, entity);
          }
          return [...byFileName.values()];
        },
      },
    );
  }

  private framesResource(
    injector: Injector,
    entities: Resource<RadarEntity[] | undefined>,
  ): Resource<RadarFrame[] | undefined> {
    const http = injector.get(HttpClient);
    const loader = new FrameLoader<RadarFrame>();
    const params = computed(
      () => (entities.hasValue() ? entities.value() : undefined),
      {
        equal: (a, b) =>
          sameArrays(a?.map((entity) => entity.fileName), b?.map((entity) => entity.fileName)),
      },
    );
    return resource({
      params,
      stream: async ({ params }) =>
        loader.stream(
          params.map((entity) => {
            const request = { entities: [entity] };
            return {
              params: request,
              load: () =>
                firstValueFrom(
                  http.post<Wrap<RadarWrapInfo>>('/radar/get_wrap_for_entities', request),
                ).then((wrap) => ({
                  name: entity.radarName,
                  time: secondsToMs(entity.time),
                  map: Grid.fromWrap(wrap),
                })),
            };
          }),
        ),
      injector,
    });
  }
}
