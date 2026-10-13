import { HttpResourceRequest } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { modelAtPoint } from '../../../layers/model/model-layer';
import { TimeService } from '../../../services/time-service';
import { PointService, PointView } from '../point-menu/point-service';

@Service()
export class SoundingTableService {
  private timeService = inject(TimeService);
  private pointService = inject(PointService);

  request(): HttpResourceRequest | undefined {
    const point = this.pointService.point();
    if (this.pointService.view() !== PointView.SoundingTable || !point) return undefined;
    const [lon, lat] = point;
    return {
      url: '/model/air_column_nearest',
      params: { model: modelAtPoint(lon, lat), lat, lon, forecasttime: this.timeService.displayTime() },
    };
  }
}
