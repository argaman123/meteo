import { HttpClient, httpResource } from '@angular/common/http';
import { Injector, Resource, Signal, computed, resource } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Radar } from '../../engine/looks/radar';
import { Grid } from '../../objects/grid';
import { Provider } from '../../objects/provider';
import { TimeRange } from '../../services/time-service';
import { RadarTimes } from '../../types/radar';
import { Wrap } from '../../types/wrap';
import { sameArrays } from '../../utils/arrays';
import { minutesToMs } from '../../utils/time';
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
  readonly looks = [
    {
      look: new Radar(
        new Provider((radars: RadarLoop[]) => radars.map((radar) => radar.shown.map)),
        this.minimumRain,
      ),
      name: 'גשם',
      checked: true,
    },
  ];

  hover(radars: RadarLoop[], lon: number, lat: number): string {
    const values = radars
      .map((radar) => radar.shown.map.valueAt(lon, lat, 'nearest'))
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
      shown: radar.frames.reduce((nearest, frame) =>
        Math.abs(frame.time - loopTime) < Math.abs(nearest.time - loopTime)
          ? frame
          : nearest,
      ),
    }));
  }

  fetch(on: Inputs, injector: Injector): Signal<RadarLoop[] | null | undefined> {
    const times = this.timesResource(on, injector);
    const frames = this.framesResource(injector, times);
    return computed(() => {
      if (!frames.hasValue()) return undefined;
      const radars = this.loopsOf(frames.value());
      if (radars.length > 0) return radars;
      const expected = times.hasValue() && times.value().some((radar) => radar.times.length > 0);
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

  private timesResource(on: Inputs, injector: Injector): Resource<RadarTimes[] | undefined> {
    return httpResource<RadarTimes[]>(
      () => ({
        url: '/api/radar/times',
        params: {
          start: String(on.exactTime() - minutesToMs(this.askMinutes)),
          end: String(on.exactTime()),
        },
      }),
      { injector },
    );
  }

  private framesResource(
    injector: Injector,
    times: Resource<RadarTimes[] | undefined>,
  ): Resource<RadarFrame[] | undefined> {
    const http = injector.get(HttpClient);
    const loader = new FrameLoader<RadarFrame>();
    const params = computed(
      () => (times.hasValue() ? times.value() : undefined),
      { equal: (a, b) => this.sameRadarTimes(a, b) },
    );
    return resource({
      params,
      stream: async ({ params }) =>
        loader.stream(
          params.flatMap((radar) =>
            radar.times.map((time) => {
              const request: Record<string, string> = { radar: radar.name, time: String(time) };
              return {
                params: request,
                load: () =>
                  this.loadMap(http, request).then((map) => ({ name: radar.name, time, map })),
              };
            }),
          ),
        ),
      injector,
    });
  }

  private async loadMap(http: HttpClient, request: Record<string, string>): Promise<Grid> {
    const wrap = await firstValueFrom(http.get<Wrap>('/api/radar', { params: request }));
    return Grid.fromWrap(wrap);
  }

  private sameRadarTimes(a: RadarTimes[] | undefined, b: RadarTimes[] | undefined): boolean {
    if (a === undefined || b === undefined) return a === b;
    return (
      a.length === b.length &&
      a.every((radar, index) => radar.name === b[index].name && sameArrays(radar.times, b[index].times))
    );
  }
}
