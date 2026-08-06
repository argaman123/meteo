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
  readonly now = signal(Date.now());
  readonly live = signal(true);
  readonly windows = signal<TimeWindow[]>([]);
  readonly forcedTimes = signal<number[]>([]);

  readonly window = computed(
    () => {
      const windows = this.windows();
      const backHours = windows.length ? Math.max(...windows.map((w) => w.backHours)) : 24;
      const forwardHours = windows.length ? Math.max(...windows.map((w) => w.forwardHours)) : 96;
      const anchor = Math.round(this.now() / 300_000) * 300_000;
      return {
        start: anchor - backHours * 3_600_000,
        end: anchor + forwardHours * 3_600_000,
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
      const stepMs = stepHours * 3_600_000;
      for (let time = Math.ceil(start / stepMs) * stepMs; time <= end; time += stepMs) {
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
    const handle = setInterval(() => this.now.set(Date.now()), 60000);
    inject(DestroyRef).onDestroy(() => clearInterval(handle));
  }

  jumpTo(unixTime: number): void {
    this.live.set(false);
    this.currentTime.set(this.snapJump(unixTime));
  }

  jumpBy(hours: number): void {
    this.jumpTo(this.currentTime() + hours * 3_600_000);
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

  snapJump(unixTime: number): number {
    const points = this.timeStops();
    if (!points.length) return unixTime;
    return points.reduce((nearest, point) =>
      Math.abs(point - unixTime) < Math.abs(nearest - unixTime) ? point : nearest,
    );
  }
}
