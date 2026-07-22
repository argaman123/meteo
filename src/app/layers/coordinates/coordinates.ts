import { Signal, signal } from '@angular/core';
import { Control, options, OptionsPresentation } from '../../utils/controls';
import { CoordinateFormat, formatCoordinates } from '../../utils/geo';
import { Layer, LookEntry } from '../base/layer';

export class Coordinates extends Layer<null> {
  readonly name = 'קואורדינטות';
  readonly looks: LookEntry[] = [];
  override readonly timeWindow = null;
  readonly format = options<CoordinateFormat>(CoordinateFormat.Decimal, [
    { value: CoordinateFormat.Decimal, label: 'DD' },
    { value: CoordinateFormat.DegreesMinutesSeconds, label: 'DMS' },
  ], 'פורמט', OptionsPresentation.Select);
  override readonly controls: Control[] = [this.format];

  hover(data: null, lon: number, lat: number): string {
    return formatCoordinates(lon, lat, this.format());
  }

  fetch(): Signal<null> {
    return signal(null);
  }
}
