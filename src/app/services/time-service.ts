import { DestroyRef, Service, computed, inject, linkedSignal, signal } from '@angular/core';

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
  readonly now = signal(Math.floor(Date.now() / 1000));
  readonly live = signal(true);
  readonly windows = signal<TimeWindow[]>([]);
  readonly forcedTimes = signal<number[]>([]);

  readonly window = computed(
    () => {
      const windows = this.windows();
      const backHours = windows.length ? Math.max(...windows.map((w) => w.backHours)) : 24;
      const forwardHours = windows.length ? Math.max(...windows.map((w) => w.forwardHours)) : 96;
      const anchor = Math.round(this.now() / 300) * 300;
      return {
        start: anchor - backHours * 3600,
        end: anchor + forwardHours * 3600,
      };
    },
    { equal: (a, b) => a.start === b.start && a.end === b.end },
  );

  private timeStops = computed(() => {
    const { start, end } = this.window();
    const forced = this.forcedTimes();
    if (forced.length) return [...forced].sort((a, b) => a - b);
    const points = new Set<number>();
    const steps = this.windows()
      .map((window) => window.stepHours)
      .filter((stepHours) => stepHours !== undefined);
    for (const stepHours of steps.length ? steps : [3]) {
      const stepSeconds = stepHours * 3600;
      for (let time = Math.ceil(start / stepSeconds) * stepSeconds; time <= end; time += stepSeconds) {
        points.add(time);
      }
    }
    return [...points].sort((a, b) => a - b);
  });

  readonly currentTime = linkedSignal<{ live: boolean; now: number; timeStops: number[] }, number>({
    source: () => ({ live: this.live(), now: this.now(), timeStops: this.timeStops() }),
    computation: (source, previous) =>
      source.live || previous === undefined ? this.snapJump(source.now) : previous.value,
  });

  constructor() {
    const handle = setInterval(() => this.now.set(Math.floor(Date.now() / 1000)), 60000);
    inject(DestroyRef).onDestroy(() => clearInterval(handle));
  }

  jumpTo(unixSeconds: number): void {
    this.live.set(false);
    this.currentTime.set(this.snapJump(unixSeconds));
  }

  jumpBy(hours: number): void {
    this.jumpTo(this.currentTime() + hours * 3600);
  }

  stepForward(): void {
    const next = this.timeStops().find((point) => point > this.currentTime());
    if (next !== undefined) this.jumpTo(next);
  }

  stepBack(): void {
    const previous = this.timeStops()
      .filter((point) => point < this.currentTime())
      .at(-1);
    if (previous !== undefined) this.jumpTo(previous);
  }

  jumpToNow(): void {
    this.live.set(true);
  }

  snapJump(unixSeconds: number): number {
    const points = this.timeStops();
    if (!points.length) return unixSeconds;
    return points.reduce((nearest, point) =>
      Math.abs(point - unixSeconds) < Math.abs(nearest - unixSeconds) ? point : nearest,
    );
  }
}
