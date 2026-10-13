import { Component, ElementRef, computed, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight,
  lucideCamera,
  lucideChevronLeft,
  lucideChevronRight,
} from '@ng-icons/lucide';
import { matDarkModeRound, matLightModeRound } from '@ng-icons/material-icons/round';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmTooltip } from '@spartan-ng/helm/tooltip';
import { POLYGONS_LEGEND } from '../../layers/polygons/polygons-layer';
import { ScreenshotService } from '../../services/screenshot-service';
import { Sector } from '../../types/polygons';
import { formatLocalDay } from '../../utils/time';
import { Quality, quality } from '../home/settings-panel/settings-controls';
import { DailyForecastService } from './daily-forecast-service';
import { ForecastMap } from './forecast-map/forecast-map';

@Component({
  selector: 'app-daily-forecast-page',
  imports: [ForecastMap, HlmButton, HlmTooltip, NgIcon, RouterLink],
  viewProviders: [
    provideIcons({
      lucideArrowRight,
      lucideCamera,
      lucideChevronLeft,
      lucideChevronRight,
      matDarkModeRound,
      matLightModeRound,
    }),
  ],
  host: { class: 'block h-full', '[class.low-quality]': 'lowQuality()' },
  templateUrl: './daily-forecast-page.html',
})
export class DailyForecastPage {
  protected forecast = inject(DailyForecastService);
  private screenshot = inject(ScreenshotService);
  protected readonly legend = POLYGONS_LEGEND.stops;
  protected readonly lowQuality = computed(() => quality() === Quality.Low);
  private screenshotArea = viewChild.required<ElementRef<HTMLDivElement>>('screenshotArea');

  protected readonly twoRows = computed(
    () => this.forecast.sector() === Sector.Big && this.forecast.forecastTimes().length > 2,
  );
  protected readonly dateLabel = computed(() => formatLocalDay(this.forecast.times()[0]));

  protected takeScreenshot(): void {
    const dayOrNight = this.forecast.isNight() ? 'לילה' : 'יום';
    void this.screenshot.takeScreenshot(
      this.screenshotArea().nativeElement,
      `תחזית יומית ${this.dateLabel()} ${dayOrNight}`,
    );
  }
}
