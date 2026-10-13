import { DestroyRef, Service, computed, inject, linkedSignal, signal } from '@angular/core';
import { hoursToMs, mergeTimes, minutesToMs } from '../utils/time';

export interface TimeWindow {
  backHours: number;
  forwardHours: number;
  stepHours?: number;
}

export interface TimeRange {
  start: number;
  end: number;
}

// TODO: UNVERIFIED CODE BELOW
@Service()
export class TimeService {
  readonly now = signal(Date.now());
  readonly live = signal(true);
  readonly windows = signal<TimeWindow[]>([]);
  private readonly forcedTimes = signal<number[]>([]);

  readonly window = computed(
    () => {
      const windows = this.windows();
      const backHours = windows.length ? Math.max(...windows.map((w) => w.backHours)) : 24;
      const forwardHours = windows.length ? Math.max(...windows.map((w) => w.forwardHours)) : 96;
      const anchor = Math.round(this.now() / minutesToMs(5)) * minutesToMs(5);
      return {
        start: anchor - hoursToMs(backHours),
        end: anchor + hoursToMs(forwardHours),
      };
    },
    { equal: (a, b) => a.start === b.start && a.end === b.end },
  );

  readonly timeStops = computed(() => {
    const { start, end } = this.window();
    const forced = this.forcedTimes();
    if (forced.length) return forced;
    const points = new Set<number>();
    const steps = this.windows()
      .map((window) => window.stepHours)
      .filter((stepHours) => stepHours !== undefined);
    for (const stepHours of steps.length ? steps : [3]) {
      const stepMs = hoursToMs(stepHours);
      for (let time = Math.ceil(start / stepMs) * stepMs; time <= end; time += stepMs) {
        points.add(time);
      }
    }
    return [...points].sort((a, b) => a - b);
  });

  readonly exactTime = linkedSignal<{ live: boolean; now: number }, number>({
    source: () => ({ live: this.live(), now: this.now() }),
    computation: (source, previous) =>
      source.live || previous === undefined ? source.now : previous.value,
  });

  readonly displayTime = computed(() => this.snapJump(this.exactTime()));

  constructor() {
    const handle = setInterval(() => this.now.set(Date.now()), minutesToMs(1));
    inject(DestroyRef).onDestroy(() => clearInterval(handle));
  }

  setForcedTimes(...layerTimes: number[][]): void {
    this.forcedTimes.set(mergeTimes(layerTimes));
  }

  jumpTo(unixTime: number): void {
    this.live.set(false);
    this.exactTime.set(this.snapJump(unixTime));
  }

  setExactTime(unixTime: number): void {
    this.live.set(false);
    this.exactTime.set(unixTime);
  }

  jumpBy(hours: number): void {
    this.jumpTo(this.displayTime() + hoursToMs(hours));
  }

  stepForward(): void {
    const next = this.timeStops().find((point) => point > this.displayTime());
    if (next !== undefined) this.jumpTo(next);
  }

  stepBack(): void {
    const previous = this.timeStops()
      .filter((point) => point < this.displayTime())
      .at(-1);
    if (previous !== undefined) this.jumpTo(previous);
  }

  jumpToNow(): void {
    this.live.set(true);
  }

  snapJump(unixTime: number): number {
    const points = this.timeStops();
    if (!points.length) return unixTime;
    return points.reduce((nearest, point) =>
      Math.abs(point - unixTime) < Math.abs(nearest - unixTime) ? point : nearest,
    );
  }
}
