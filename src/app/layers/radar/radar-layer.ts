import { HttpClient, httpResource } from '@angular/common/http';
import { Injector, Signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Grid } from '../../objects/grid';
import { RadarEntity, RadarTimeRange } from '../../types/radar';
import { RadarWrapInfo, Wrap } from '../../types/wrap';
import { minutesToMs, msToSeconds, secondsToMs } from '../../utils/time';
import { Inputs } from '../base/layer';
import { FrameRequest, Loop, LoopLayer } from '../base/loop-layer';

interface RadarFrame {
  name: string;
  time: number;
  map: Grid;
}

export type RadarLoop = Loop<RadarFrame>;

export abstract class RadarLayer extends LoopLayer<RadarFrame> {
  protected abstract readonly timesRoute: string;
  protected override readonly loopIdOf = (frame: RadarFrame) => frame.name;

  protected frameRequests(
    on: Inputs,
    injector: Injector,
  ): Signal<FrameRequest<RadarFrame>[] | undefined> {
    const http = injector.get(HttpClient);
    const entities = httpResource(
      () => ({
        url: this.timesRoute,
        params: {
          start: msToSeconds(on.exactTime() - minutesToMs(this.loopMinutes)),
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
    return computed(() =>
      entities.hasValue()
        ? entities.value().map((entity) => this.frameRequest(http, entity))
        : undefined,
    );
  }

  private frameRequest(http: HttpClient, entity: RadarEntity): FrameRequest<RadarFrame> {
    const request = { entities: [entity] };
    return {
      params: request,
      load: () =>
        firstValueFrom(
          http.post<Wrap<RadarWrapInfo>>('/radar/get_wrap_for_entities', request),
        ).then((wrap) => [
          { name: entity.radarName, time: secondsToMs(entity.time), map: Grid.fromWrap(wrap) },
        ]),
    };
  }
}
