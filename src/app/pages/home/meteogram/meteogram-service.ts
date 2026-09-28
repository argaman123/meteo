import { HttpResourceRequest, httpResource } from '@angular/common/http';
import { Service, computed, inject, linkedSignal, signal, untracked } from '@angular/core';
import { modelAtPoint } from '../../../layers/model/model-layer';
import { layers } from '../../../layers/registry';
import { MeteogramData } from '../../../objects/meteogram-data';
import { TimeRange, TimeService } from '../../../services/time-service';
import { Parameter } from '../../../types/parameter';
import { PointForecast } from '../../../types/polygons';
import { MeteogramWrap } from '../../../types/wrap';
import { hoursToMs } from '../../../utils/time';
import { PointService } from '../point-menu/point-service';

export enum MeteogramTab {
  Temperature = 'temperature',
  Wind = 'wind',
  Clouds = 'clouds',
}

@Service()
export class MeteogramService {
  private time = inject(TimeService);
  private points = inject(PointService);

  readonly topFt = 45_000;
  readonly tab = signal(MeteogramTab.Temperature);
  private openedTabs = linkedSignal({
    source: this.points.point,
    computation: () => [untracked(this.tab)],
  });

  readonly range = computed<TimeRange>(
    () => {
      const { backHours, forwardHours } = layers.temperature.timeWindow;
      const hour = Math.floor(this.time.now() / hoursToMs(1)) * hoursToMs(1);
      return { start: hour - hoursToMs(backHours), end: hour + hoursToMs(forwardHours) };
    },
    { equal: (a, b) => a.start === b.start && a.end === b.end },
  );

  readonly temperature = httpResource(
    () => this.modelRequest(MeteogramTab.Temperature, Parameter.Temperature),
    { parse: (wrap) => MeteogramData.fromWrap(wrap as MeteogramWrap) },
  );
  readonly u = httpResource(() => this.modelRequest(MeteogramTab.Wind, Parameter.U), {
    parse: (wrap) => MeteogramData.fromWrap(wrap as MeteogramWrap),
  });
  readonly v = httpResource(() => this.modelRequest(MeteogramTab.Wind, Parameter.V), {
    parse: (wrap) => MeteogramData.fromWrap(wrap as MeteogramWrap),
  });
  readonly clouds = httpResource<PointForecast[]>(() => this.cloudsRequest());

  showTab(tab: MeteogramTab): void {
    this.tab.set(tab);
    this.openedTabs.update((tabs) => (tabs.includes(tab) ? tabs : [...tabs, tab]));
  }

  private modelRequest(tab: MeteogramTab, parameter: Parameter): HttpResourceRequest | undefined {
    const point = this.points.point();
    if (!point || !this.openedTabs().includes(tab)) return undefined;
    const [lon, lat] = point;
    const { start, end } = this.range();
    return {
      url: '/api/meteogram',
      params: {
        parameter,
        lat,
        lon,
        model: modelAtPoint(lon, lat),
        start,
        end,
      },
    };
  }

  private cloudsRequest(): HttpResourceRequest | undefined {
    const point = this.points.point();
    if (!point || !this.openedTabs().includes(MeteogramTab.Clouds)) return undefined;
    const [lon, lat] = point;
    const { start, end } = this.range();
    return {
      url: '/api/polygons/point',
      params: { lat, lon, start, end },
    };
  }
}
