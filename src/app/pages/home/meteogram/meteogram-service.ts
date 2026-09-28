import { HttpResourceRequest } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { modelAtPoint } from '../../../layers/model/model-layer';
import { layers } from '../../../layers/registry';
import { TimeRange, TimeService } from '../../../services/time-service';
import { Parameter } from '../../../types/parameter';
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

  readonly range = computed<TimeRange>(
    () => {
      const { backHours, forwardHours } = layers.temperature.timeWindow;
      const hour = Math.floor(this.time.now() / hoursToMs(1)) * hoursToMs(1);
      return { start: hour - hoursToMs(backHours), end: hour + hoursToMs(forwardHours) };
    },
    { equal: (a, b) => a.start === b.start && a.end === b.end },
  );

  modelRequest(parameter: Parameter): HttpResourceRequest | undefined {
    const point = this.points.point();
    if (!point) return undefined;
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

  cloudsRequest(): HttpResourceRequest | undefined {
    const point = this.points.point();
    if (!point) return undefined;
    const [lon, lat] = point;
    const { start, end } = this.range();
    return {
      url: '/api/polygons/point',
      params: { lat, lon, start, end },
    };
  }
}
