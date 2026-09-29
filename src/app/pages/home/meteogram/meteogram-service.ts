import { HttpResourceRequest, httpResource } from '@angular/common/http';
import { Service, computed, inject, linkedSignal, signal, untracked } from '@angular/core';
import { modelAtPoint } from '../../../layers/model/model-layer';
import { layers } from '../../../layers/registry';
import { MeteogramData } from '../../../objects/meteogram-data';
import { TimeRange, TimeService } from '../../../services/time-service';
import { PointEvents } from '../../../types/polygons';
import { AirColumnTime, AirLevelData } from '../../../types/sounding';
import { hoursToMs } from '../../../utils/time';
import { Unit, convertBetween } from '../../../utils/units';
import { PointService } from '../point-menu/point-service';

export enum MeteogramTab {
  Temperature = 'temperature',
  Wind = 'wind',
  Clouds = 'clouds',
}

export interface MeteogramColumn {
  temperature: MeteogramData;
  u: MeteogramData;
  v: MeteogramData;
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

  readonly column = httpResource(() => this.columnRequest(), {
    parse: (columns) => this.columnOf(columns as AirColumnTime[]),
  });
  readonly clouds = httpResource<PointEvents[]>(() => this.cloudsRequest());

  showTab(tab: MeteogramTab): void {
    this.tab.set(tab);
    this.openedTabs.update((tabs) => (tabs.includes(tab) ? tabs : [...tabs, tab]));
  }

  private columnRequest(): HttpResourceRequest | undefined {
    const point = this.points.point();
    const opened = this.openedTabs();
    if (!point || !(opened.includes(MeteogramTab.Temperature) || opened.includes(MeteogramTab.Wind))) {
      return undefined;
    }
    const [lon, lat] = point;
    const { start, end } = this.range();
    return {
      url: '/model/air_column_in_between',
      params: { model: modelAtPoint(lon, lat), lat, lon, start, end },
    };
  }

  private columnOf(columns: AirColumnTime[]): MeteogramColumn {
    const heightsFt = Array.from({ length: this.topFt / 1000 + 1 }, (_, index) => index * 1000);
    const section = (valueOf: (level: AirLevelData) => number) =>
      MeteogramData.fromAirColumns(columns, heightsFt, valueOf);
    const windMs = (level: AirLevelData) =>
      convertBetween(level.windStr, Unit.Knots, Unit.MetersPerSecond);
    return {
      temperature: section((level) => level.temperature),
      u: section((level) => windMs(level) * Math.cos(level.windDir)),
      v: section((level) => windMs(level) * Math.sin(level.windDir)),
    };
  }

  private cloudsRequest(): HttpResourceRequest | undefined {
    const point = this.points.point();
    if (!point || !this.openedTabs().includes(MeteogramTab.Clouds)) return undefined;
    const [lon, lat] = point;
    const { start, end } = this.range();
    return {
      url: '/polygon/get_point_events_between_times',
      params: { lat, lon, start_time: start, end_time: end },
    };
  }
}
