import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCloud,
  lucideMapPin,
  lucideThermometer,
  lucideWind,
  lucideX,
} from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmTabs, HlmTabsList, HlmTabsTrigger } from '@spartan-ng/helm/tabs';
import { GradientLegend, LegendType, gradientLegend } from '../../../engine/base/look';
import { MapService } from '../../../engine/map-service';
import { TEMPERATURE_PALETTE } from '../../../layers/model/temperature';
import { WIND_SPEED_PALETTE } from '../../../layers/model/wind';
import { POLYGONS_LEGEND } from '../../../layers/polygons/polygons-layer';
import { formatCoordinates } from '../../../utils/geo';
import { Quantity, Unit } from '../../../utils/units';
import { coordinateFormat } from '../settings-panel/settings-controls';
import { CloudsChart } from './clouds-chart/clouds-chart';
import { MeteogramService, MeteogramTab } from './meteogram-service';
import { TemperatureChart } from './temperature-chart/temperature-chart';
import { WindChart } from './wind-chart/wind-chart';

@Component({
  selector: 'app-meteogram',
  imports: [
    HlmButton,
    HlmTabs,
    HlmTabsList,
    HlmTabsTrigger,
    NgIcon,
    CloudsChart,
    TemperatureChart,
    WindChart,
  ],
  viewProviders: [
    provideIcons({ lucideCloud, lucideMapPin, lucideThermometer, lucideWind, lucideX }),
  ],
  templateUrl: './meteogram.html',
  host: { class: 'block' },
})
export class Meteogram {
  protected meteogram = inject(MeteogramService);
  private map = inject(MapService);
  private pin = viewChild.required<ElementRef<HTMLElement>>('pin');
  protected readonly tabs = MeteogramTab;
  protected readonly LegendType = LegendType;
  protected readonly tabNames = [
    {
      tab: MeteogramTab.Temperature,
      name: 'טמפרטורה',
      icon: 'lucideThermometer',
      legend: () => gradientLegend(TEMPERATURE_PALETTE, Quantity.Temperature, Unit.Celsius),
    },
    {
      tab: MeteogramTab.Wind,
      name: 'רוח',
      icon: 'lucideWind',
      legend: () => gradientLegend(WIND_SPEED_PALETTE, Quantity.WindSpeed, Unit.MetersPerSecond),
    },
    {
      tab: MeteogramTab.Clouds,
      name: 'עננות ותופעות',
      icon: 'lucideCloud',
      legend: () => POLYGONS_LEGEND,
    },
  ];

  constructor() {
    afterRenderEffect(() => {
      const point = this.meteogram.point();
      const pin = this.pin().nativeElement;
      if (point) this.map.showMarker(pin, point);
      else this.map.hideMarker(pin);
    });
  }

  protected legend = computed(() =>
    this.tabNames.find((entry) => entry.tab === this.meteogram.tab())!.legend(),
  );

  protected coordinates = computed(() => {
    const point = this.meteogram.point();
    return point ? formatCoordinates(point[0], point[1], coordinateFormat()) : '';
  });

  protected selectTab(tab: string): void {
    this.meteogram.tab.set(tab as MeteogramTab);
  }

  protected gradientBackground(legend: GradientLegend): string {
    return `linear-gradient(to right, ${legend.stops.map((stop) => stop.color).join(', ')})`;
  }
}
