import { DestroyRef, Service, computed, inject, signal } from '@angular/core';
import { clampToRange, snapToStep } from '../utils/time';

export interface TimeWindow {
  backHours: number;
  forwardHours: number;
  stepHours: number;
}

// TODO: UNVERIFIED CODE BELOW
@Service()
export class TimeService {
  readonly now = signal(Math.floor(Date.now() / 1000));
  readonly live = signal(true);
  readonly windows = signal<TimeWindow[]>([]);

  readonly stepHours = computed(() => {
    const steps = this.windows().map((window) => window.stepHours);
    return steps.length ? Math.min(...steps) : 3;
  });

  readonly window = computed(() => {
    const windows = this.windows();
    const backHours = windows.length ? Math.max(...windows.map((w) => w.backHours)) : 24;
    const forwardHours = windows.length ? Math.max(...windows.map((w) => w.forwardHours)) : 96;
    return {
      start: this.now() - backHours * 3600,
      end: this.now() + forwardHours * 3600,
    };
  });

  readonly currentTime = signal(snapToStep(Math.floor(Date.now() / 1000), 3));

  constructor() {
    const handle = setInterval(() => this.followClock(), 60000);
    inject(DestroyRef).onDestroy(() => clearInterval(handle));
  }

  jumpTo(unixSeconds: number): void {
    this.live.set(false);
    this.currentTime.set(this.snapInsideWindow(unixSeconds));
  }

  jumpBy(hours: number): void {
    this.jumpTo(this.currentTime() + hours * 3600);
  }

  stepForward(): void {
    this.jumpBy(this.stepHours());
  }

  stepBack(): void {
    this.jumpBy(-this.stepHours());
  }

  jumpToNow(): void {
    this.currentTime.set(this.snapInsideWindow(this.now()));
    this.live.set(true);
  }

  private followClock(): void {
    this.now.set(Math.floor(Date.now() / 1000));
    if (this.live()) this.currentTime.set(this.snapInsideWindow(this.now()));
  }

  private snapInsideWindow(unixSeconds: number): number {
    const { start, end } = this.window();
    const stepSeconds = this.stepHours() * 3600;
    const snapped = snapToStep(clampToRange(unixSeconds, start, end), this.stepHours());
    const earliest = Math.ceil(start / stepSeconds) * stepSeconds;
    const latest = Math.floor(end / stepSeconds) * stepSeconds;
    return clampToRange(snapped, earliest, latest);
  }
}
