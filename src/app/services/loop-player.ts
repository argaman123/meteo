import { DestroyRef, Service, computed, inject, signal } from '@angular/core';
import { findNearestTime, mergeTimes } from '../utils/time';

@Service()
export class LoopPlayer {
  private readonly frameMs = 400;
  private readonly restartDelayMs = 1500;
  readonly loopTime = signal<number | null>(null);
  readonly nearestFrameTime = computed(() => {
    const loopTime = this.loopTime();
    return loopTime === null ? null : findNearestTime(this.times, loopTime, 24);
  });
  private times: number[] = [];
  private layerDataStepMs = 0;

  private handle = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.pause());
  }

  setTimes(...loopTimes: number[][]): void {
    this.times = mergeTimes(loopTimes);
    this.layerDataStepMs = Math.max(0, ...loopTimes.map(smallestGap));
    if (this.times.length) {
      this.play();
    } else {
      this.loopTime.set(null);
      this.pause();
    }
  }

  private play(): void {
    if (this.handle) return;
    let lastFrame = performance.now();
    const frame = (now: number) => {
      this.advance(now - lastFrame);
      lastFrame = now;
      this.handle = requestAnimationFrame(frame);
    };
    this.handle = requestAnimationFrame(frame);
  }

  private pause(): void {
    cancelAnimationFrame(this.handle);
    this.handle = 0;
  }

  private advance(elapsedMs: number): void {
    if (!this.times.length) return;
    const start = this.times[0];
    const end = this.times[this.times.length - 1];
    if (!this.layerDataStepMs) {
      this.loopTime.set(end);
      return;
    }
    const loopTime = this.loopTime();
    if (loopTime === null || loopTime < start) {
      this.loopTime.set(start);
      return;
    }
    const next = loopTime + (elapsedMs * this.layerDataStepMs) / this.frameMs;
    const holdUntil = end + (this.restartDelayMs / this.frameMs) * this.layerDataStepMs;
    this.loopTime.set(next > holdUntil ? start : next);
  }
}

function smallestGap(times: number[]): number {
  let gap = 0;
  for (let index = 1; index < times.length; index++) {
    const step = times[index] - times[index - 1];
    if (step > 0 && (!gap || step < gap)) gap = step;
  }
  return gap;
}
