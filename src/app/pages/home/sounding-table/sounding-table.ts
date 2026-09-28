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
import { matTerrainRound } from '@ng-icons/material-icons/round';
import { HlmButton } from '@spartan-ng/helm/button';
import { TEMPERATURE_PALETTE } from '../../../layers/model/temperature';
import { metDirection } from '../../../layers/model/wind';
import { Sounding } from '../../../objects/sounding';
import { SoundingLevel, SoundingWrap } from '../../../types/sounding';
import { colorScale } from '../../../utils/color-scale';
import { formatCoordinates } from '../../../utils/geo';
import { feetAtPressure, relativeHumidity } from '../../../utils/thermodynamics';
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
      matTerrainRound,
    }),
  ],
  templateUrl: './sounding-table.html',
  host: { class: 'block' },
})
export class SoundingTable {
  private soundingTable = inject(SoundingTableService);
  protected points = inject(PointService);
  private scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  private readonly stepFeet = 1000;
  private readonly temperatureScale = colorScale(TEMPERATURE_PALETTE, 'smooth');
  protected readonly highestFirst = signal(true);

  protected response = httpResource(() => this.soundingTable.request(), {
    parse: (wrap) => Sounding.fromWrap(wrap as SoundingWrap),
  });

  protected sounding = linkedSignal<Sounding | null, Sounding | null>({
    source: () => (this.response.hasValue() ? this.response.value() : null),
    computation: (value, previous) =>
      value ?? (this.response.isLoading() ? (previous?.value ?? null) : null),
  });

  protected active = computed(() => this.points.view() === PointView.SoundingTable);

  protected coordinates = computed(() => {
    const point = this.points.point();
    return point ? formatCoordinates(point[0], point[1], coordinateFormat()) : '';
  });

  protected units = computed(() => ({
    height: unitLabel(Quantity.GeopotentialHeight),
    pressure: unitLabel(Quantity.Pressure),
    temperature: unitLabel(Quantity.Temperature),
    humidity: unitLabel(Quantity.RelativeHumidity),
    windSpeed: unitLabel(Quantity.WindSpeed),
  }));

  protected time = computed(() => {
    const sounding = this.sounding();
    return sounding ? formatLocalTime(sounding.time) : '';
  });

  protected rows = computed(() => {
    const sounding = this.sounding();
    if (!sounding) return [];
    const surface = sounding.levels[0];
    const rows = [this.rowOf(surface, true)];
    const surfaceFeet = convertBetween(surface.height, Unit.Meters, Unit.Feet);
    for (
      let feet = (Math.floor(surfaceFeet / this.stepFeet) + 1) * this.stepFeet;
      ;
      feet += this.stepFeet
    ) {
      const level = sounding.levelAtHeight(convertBetween(feet, Unit.Feet, Unit.Meters));
      if (!level) break;
      rows.push(this.rowOf(level, false));
    }
    return this.highestFirst() ? rows.reverse() : rows;
  });

  protected toggleHeightOrder(): void {
    this.highestFirst.update((highestFirst) => !highestFirst);
    this.scroller()?.nativeElement.scrollTo({ top: 0 });
  }

  private rowOf(level: SoundingLevel, surface: boolean) {
    const heightFeet = convertBetween(level.height, Unit.Meters, Unit.Feet);
    const direction = metDirection(level.u, level.v);
    const humidity = relativeHumidity(level.temperature, level.dewpoint);
    return {
      surface,
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
      humidity: formatNumber(humidity, Quantity.RelativeHumidity, Unit.Percent),
      humidityFraction: Math.min(100, humidity),
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
