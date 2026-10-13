import { Service, computed, inject, signal } from '@angular/core';
import { SECTOR_CHOICES, mapValidity } from '../../layers/polygons/polygons-layer';
import { layers } from '../../layers/registry';
import { TimeService } from '../../services/time-service';
import { Sector } from '../../types/polygons';
import { options } from '../../utils/controls';
import { addLocalHours, atLocalHour, hoursToMs, localHourOf } from '../../utils/time';

@Service()
export class DailyForecastService {
  private time = inject(TimeService);
  private readonly dayStartHour = 8;
  private readonly selectedTime = signal<number | null>(null);

  readonly sector = options<Sector>(Sector.Dev, SECTOR_CHOICES);
  private readonly liveTime = computed(() => this.findLiveTime());
  readonly startTime = computed(() => Math.max(this.selectedTime() ?? 0, this.liveTime()));
  readonly isLive = computed(() => this.startTime() === this.liveTime());
  readonly isNight = computed(() => localHourOf(this.startTime()) !== this.dayStartHour);
  readonly times = computed(() => this.timesOf(this.startTime()));
  readonly forecastTimes = computed(() =>
    this.isLive() ? this.times().filter((time) => !this.hasPassed(time)) : this.times(),
  );
  readonly canShowNextTimes = computed(
    () =>
      addLocalHours(this.startTime(), 12) <=
      this.time.now() + hoursToMs(layers.polygons.timeWindow.forwardHours),
  );

  showNextTimes(): void {
    this.selectedTime.set(addLocalHours(this.startTime(), 12));
  }

  showPreviousTimes(): void {
    this.selectedTime.set(addLocalHours(this.startTime(), -12));
  }

  showLiveTimes(): void {
    this.selectedTime.set(null);
  }

  private findLiveTime(): number {
    const latestValidTime = mapValidity(this.time.now()).end;
    const hour = localHourOf(latestValidTime);
    return atLocalHour(latestValidTime, hour - ((hour - this.dayStartHour + 24) % 12));
  }

  private timesOf(startTime: number): number[] {
    return [0, 3, 6, 9].map((hours) => addLocalHours(startTime, hours));
  }

  private hasPassed(forecastTime: number): boolean {
    return mapValidity(forecastTime).end <= this.time.now();
  }
}
