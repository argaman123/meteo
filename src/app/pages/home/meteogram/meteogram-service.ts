import { HttpResourceRequest } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { LOCAL_COVERAGE } from '../../../layers/model/model-layer';
import { layers } from '../../../layers/registry';
import { TimeRange, TimeService } from '../../../services/time-service';
import { Parameter } from '../../../types/parameter';
import { contains } from '../../../utils/geo';
import { hoursToMs } from '../../../utils/time';

export enum MeteogramTab {
  Temperature = 'temperature',
  Wind = 'wind',
  Clouds = 'clouds',
}

@Service()
export class MeteogramService {
  private time = inject(TimeService);

  readonly topFt = 45_000;
  readonly point = signal<[number, number] | null>(null);
  readonly tab = signal(MeteogramTab.Temperature);

  readonly range = computed<TimeRange>(
    () => {
      const { backHours, forwardHours } = layers.temperature.timeWindow;
      const hour = Math.floor(this.time.now() / hoursToMs(1)) * hoursToMs(1);
      return { start: hour - hoursToMs(backHours), end: hour + hoursToMs(forwardHours) };
    },
    { equal: (a, b) => a.start === b.start && a.end === b.end },
  );

  showMeteogram(point: [number, number]): void {
    this.point.set(point);
  }

  hideMeteogram(): void {
    this.point.set(null);
  }

  modelRequest(parameter: Parameter): HttpResourceRequest | undefined {
    const point = this.point();
    if (!point) return undefined;
    const [lon, lat] = point;
    const { start, end } = this.range();
    return {
      url: '/api/meteogram',
      params: {
        parameter,
        lat,
        lon,
        model: contains(LOCAL_COVERAGE, lon, lat) ? 'local' : 'wide',
        start,
        end,
      },
    };
  }

  cloudsRequest(): HttpResourceRequest | undefined {
    const point = this.point();
    if (!point) return undefined;
    const [lon, lat] = point;
    const { start, end } = this.range();
    return {
      url: '/api/polygons/point',
      params: { lat, lon, start, end },
    };
  }
}
