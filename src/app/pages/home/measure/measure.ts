import { Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideRuler } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmTooltip } from '@spartan-ng/helm/tooltip';
import { MapPin } from '../../../directives/map-pin';
import { MeasureService } from './measure-service';

@Component({
  selector: 'app-measure',
  imports: [HlmButton, HlmTooltip, MapPin, NgIcon],
  viewProviders: [provideIcons({ lucideRuler })],
  host: { '(window:keydown.escape)': 'measure.hideMeasure()' },
  templateUrl: './measure.html',
})
export class Measure {
  protected measure = inject(MeasureService);
}
