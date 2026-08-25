import { DestroyRef, Service, computed, inject, signal } from '@angular/core';
import { findNearestTime, mergeTimes } from '../utils/time';

@Service()
export class LoopPlayer {
  private readonly frameMs = 400;
  private readonly restartDelayMs = 1500;
  readonly playing = signal(true);
  readonly speed = signal(1);
  readonly loopTime = signal<number | null>(null);
  readonly nearestFrameTime = computed(() => {
    const loopTime = this.loopTime();
    return loopTime === null ? null : findNearestTime(this.times, loopTime, 24);
  });
  readonly loopProgress = computed(() => {
    const loopTime = this.loopTime();
    if (loopTime === null || this.times.length < 2) return null;
    const first = this.times[0];
    const last = this.times[this.times.length - 1];
    return Math.min(1, Math.max(0, (loopTime - first) / (last - first)));
  });
  private times: number[] = [];
  private layerDataStepMs = 0;

  private handle = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.halt());
  }

  setTimes(...loopTimes: number[][]): void {
    this.times = mergeTimes(loopTimes);
    this.layerDataStepMs = Math.max(0, ...loopTimes.map(smallestGap));
    if (this.times.length) {
      this.run();
    } else {
      this.loopTime.set(null);
      this.playing.set(true);
      this.halt();
    }
  }

  play(): void {
    this.playing.set(true);
    this.run();
  }

  pause(): void {
    this.playing.set(false);
    this.halt();
  }

  stepFrame(direction: 1 | -1): void {
    this.pause();
    const current = this.nearestFrameTime();
    if (current === null || !this.times.length) return;
    const index = this.times.indexOf(current);
    this.loopTime.set(this.times[(index + direction + this.times.length) % this.times.length]);
  }

  private run(): void {
    if (this.handle || !this.times.length || !this.playing()) return;
    let lastFrame = performance.now();
    const frame = (now: number) => {
      this.advance(now - lastFrame);
      lastFrame = now;
      this.handle = requestAnimationFrame(frame);
    };
    this.handle = requestAnimationFrame(frame);
  }

  private halt(): void {
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
    const speedFrameMs = this.frameMs / this.speed();
    const next = loopTime + (elapsedMs * this.layerDataStepMs) / speedFrameMs;
    const holdUntil = end + (this.restartDelayMs / speedFrameMs) * this.layerDataStepMs;
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
