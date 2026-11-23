import { Signal, signal } from '@angular/core';
import { coordinateFormat } from '../../pages/home/settings-panel/settings-controls';
import { formatCoordinates } from '../../utils/coordinates';
import { Layer, LookEntry } from '../base/layer';

export class Coordinates extends Layer<true> {
  readonly name = 'קואורדינטות';
  readonly looks: LookEntry[] = [];
  override readonly timeWindow = null;

  hover(data: true, lon: number, lat: number): string {
    return formatCoordinates(lon, lat, coordinateFormat());
  }

  relevanceOf(): true {
    return true;
  }

  fetch(): Signal<true> {
    return signal(true);
  }
}
