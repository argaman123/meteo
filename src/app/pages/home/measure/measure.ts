import { Component, inject } from '@angular/core';
import { MapPin } from '../../../directives/map-pin';
import { MeasureService } from './measure-service';

@Component({
  selector: 'app-measure',
  imports: [MapPin],
  host: { '(window:keydown.escape)': 'measure.hideMeasure()' },
  templateUrl: './measure.html',
})
export class Measure {
  protected measure = inject(MeasureService);
}
