import { Component, inject } from '@angular/core';
import { TEMPERATURE_PALETTE } from '../../../../layers/model/temperature';
import { colorScale } from '../../../../utils/color-scale';
import { Quantity, Unit, format } from '../../../../utils/units';
import { MeteogramFrame } from '../meteogram-frame/meteogram-frame';
import { MeteogramService } from '../meteogram-service';
import { MeteogramColormap, MeteogramContours } from '../meteogram-colormap/meteogram-colormap';

@Component({
  selector: 'app-temperature-chart',
  imports: [MeteogramColormap, MeteogramFrame],
  templateUrl: './temperature-chart.html',
  host: { class: 'block h-full' },
})
export class TemperatureChart {
  private meteogram = inject(MeteogramService);

  protected column = this.meteogram.column;
  protected colorScale = colorScale(TEMPERATURE_PALETTE, 'smooth');
  protected readonly contours: MeteogramContours = {
    faintStep: 5,
    marked: [{ level: 0, color: '#ffffff' }],
  };

  protected hoverText = (time: number, heightFt: number): string => {
    const value = this.column.hasValue()
      ? this.column.value().temperature.valueAt(time, heightFt)
      : NaN;
    return format(value, Quantity.Temperature, Unit.Celsius);
  };
}
