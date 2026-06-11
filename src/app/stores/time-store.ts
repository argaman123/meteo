import { Service, computed, inject, signal } from '@angular/core';
import { registryEntry } from '../layers/registry';
import { clampToRange, snapToStep } from '../utils/time';
import { LayersStore } from './layers-store';

const DEFAULT_STEP_HOURS = 3;
const DEFAULT_BACK_HOURS = 24;
const DEFAULT_FORWARD_HOURS = 96;

@Service()
export class TimeStore {
  private layers = inject(LayersStore);
  private referenceNow = Math.floor(Date.now() / 1000);

  readonly stepHours = computed(() => {
    const steps = this.activeWindows().map((window) => window.stepHours);
    return steps.length ? Math.min(...steps) : DEFAULT_STEP_HOURS;
  });

  readonly window = computed(() => {
    const windows = this.activeWindows();
    const backHours = windows.length
      ? Math.max(...windows.map((w) => w.backHours))
      : DEFAULT_BACK_HOURS;
    const forwardHours = windows.length
      ? Math.max(...windows.map((w) => w.forwardHours))
      : DEFAULT_FORWARD_HOURS;
    return {
      start: this.referenceNow - backHours * 3600,
      end: this.referenceNow + forwardHours * 3600,
    };
  });

  readonly currentTime = signal(snapToStep(Math.floor(Date.now() / 1000), DEFAULT_STEP_HOURS));

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

  private activeWindows() {
    return this.layers
      .states()
      .filter((state) => state.active)
      .map((state) => registryEntry(state.id)?.timeWindow)
      .filter((window) => window !== undefined);
  }
}
