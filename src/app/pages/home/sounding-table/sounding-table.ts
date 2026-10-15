import { httpResource } from '@angular/common/http';
import {
  Component,
  ElementRef,
  computed,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowDown01,
  lucideArrowDown10,
  lucideArrowUp,
  lucideMapPin,
  lucideX,
} from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { TEMPERATURE_PALETTE } from '../../../layers/model/temperature';
import { Sounding, SoundingLevel } from '../../../objects/sounding';
import { AirColumnTime } from '../../../types/sounding';
import { colorScale } from '../../../utils/color-scale';
import { formatCoordinates } from '../../../utils/coordinates';
import { feetAtPressure } from '../../../utils/thermodynamics';
import { formatLocalTime } from '../../../utils/time';
import {
  Quantity,
  Unit,
  convertBetween,
  format,
  formatNumber,
  formatSignedNumber,
  unitLabel,
} from '../../../utils/units';
import { metDirection } from '../../../utils/wind';
import { PointService, PointView } from '../point-menu/point-service';
import { coordinateFormat } from '../settings-panel/settings-controls';
import { SoundingTableService } from './sounding-table-service';

@Component({
  selector: 'app-sounding-table',
  imports: [HlmButton, NgIcon],
  viewProviders: [
    provideIcons({
      lucideArrowDown01,
      lucideArrowDown10,
      lucideArrowUp,
      lucideMapPin,
      lucideX,
    }),
  ],
  templateUrl: './sounding-table.html',
  host: { class: 'block' },
})
export class SoundingTable {
  private soundingTableService = inject(SoundingTableService);
  protected pointService = inject(PointService);
  private scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  private readonly stepFeet = 1000;
  private readonly temperatureScale = colorScale(TEMPERATURE_PALETTE, 'smooth');
  protected readonly highestFirst = signal(true);

  protected response = httpResource(() => this.soundingTableService.request(), {
    parse: (column) => Sounding.fromAirColumn(column as AirColumnTime),
  });

  protected sounding = linkedSignal<Sounding | null, Sounding | null>({
    source: () => (this.response.hasValue() ? this.response.value() : null),
    computation: (value, previous) =>
      value ?? (this.response.isLoading() ? (previous?.value ?? null) : null),
  });

  protected active = computed(() => this.pointService.view() === PointView.SoundingTable);

  protected coordinates = computed(() => {
    const point = this.pointService.point();
    return point ? formatCoordinates(point[0], point[1], coordinateFormat()) : '';
  });

  protected units = computed(() => ({
    height: unitLabel(Quantity.GeopotentialHeight),
    pressure: unitLabel(Quantity.Pressure),
    temperature: unitLabel(Quantity.Temperature),
    humidity: unitLabel(Quantity.RelativeHumidity),
    windSpeed: unitLabel(Quantity.WindSpeed),
  }));

  protected soundingTime = computed(() => {
    const sounding = this.sounding();
    return sounding ? formatLocalTime(sounding.time) : '';
  });

  protected rows = computed(() => {
    const sounding = this.sounding();
    if (!sounding) return [];
    const rows = [];
    const lowestFeet = convertBetween(sounding.levels[0].height, Unit.Meters, Unit.Feet);
    for (
      let feet = Math.ceil(lowestFeet / this.stepFeet) * this.stepFeet;
      ;
      feet += this.stepFeet
    ) {
      const level = sounding.levelAtHeight(convertBetween(feet, Unit.Feet, Unit.Meters));
      if (!level) break;
      rows.push(this.rowOf(level));
    }
    return this.highestFirst() ? rows.reverse() : rows;
  });

  protected toggleHeightOrder(): void {
    this.highestFirst.update((highestFirst) => !highestFirst);
    this.scroller()?.nativeElement.scrollTo({ top: 0 });
  }

  private rowOf(level: SoundingLevel) {
    const heightFeet = convertBetween(level.height, Unit.Meters, Unit.Feet);
    const direction = metDirection(level.u, level.v);
    return {
      height: formatNumber(level.height, Quantity.GeopotentialHeight, Unit.Meters),
      pressure: formatNumber(level.pressure, Quantity.Pressure, Unit.Millibars),
      correction: formatSignedNumber(
        heightFeet - feetAtPressure(level.pressure),
        Quantity.GeopotentialHeight,
        Unit.Feet,
      ),
      temperature: formatNumber(level.temperature, Quantity.Temperature, Unit.Celsius),
      temperatureColor: this.temperatureScale(level.temperature).formatHex(),
      dewpoint: formatNumber(level.dewpoint, Quantity.Temperature, Unit.Celsius),
      humidity: formatNumber(level.humidity, Quantity.RelativeHumidity, Unit.Percent),
      humidityFraction: Math.min(100, level.humidity),
      windDirection: format(direction, Quantity.Direction, Unit.MetDegrees),
      downwindDegrees: direction + 180,
      windSpeed: formatNumber(
        Math.hypot(level.u, level.v),
        Quantity.WindSpeed,
        Unit.MetersPerSecond,
      ),
    };
  }
}
