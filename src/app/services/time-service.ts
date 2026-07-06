import { Service, computed, signal } from '@angular/core';
import { clampToRange, snapToStep } from '../utils/time';

export interface TimeWindow {
  backHours: number;
  forwardHours: number;
  stepHours: number;
}

@Service()
export class TimeService {
  private referenceNow = Math.floor(Date.now() / 1000);

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
      start: this.referenceNow - backHours * 3600,
      end: this.referenceNow + forwardHours * 3600,
    };
  });

  readonly currentTime = signal(snapToStep(Math.floor(Date.now() / 1000), 3));

  jumpTo(unixSeconds: number): void {
    const { start, end } = this.window();
    this.currentTime.set(snapToStep(clampToRange(unixSeconds, start, end), this.stepHours()));
  }

  stepForward(): void {
    this.jumpTo(this.currentTime() + this.stepHours() * 3600);
  }

  stepBack(): void {
    this.jumpTo(this.currentTime() - this.stepHours() * 3600);
  }

  jumpToNow(): void {
    this.jumpTo(Math.floor(Date.now() / 1000));
  }
}
