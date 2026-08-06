import { DestroyRef, Service, effect, inject, signal } from '@angular/core';
import { mergeTimes } from '../utils/time';

const NEWEST_FRAME_TICKS = 3;

@Service()
export class LoopPlayer {
  readonly playingTime = signal<number | null>(null);
  readonly frameMs = signal(500);
  private times: number[] = [];
  private tick = 0;

  constructor() {
    let handle: ReturnType<typeof setInterval> | undefined = undefined;
    effect(() => {
      clearInterval(handle);
      handle = setInterval(() => this.advance(), this.frameMs());
    });
    inject(DestroyRef).onDestroy(() => clearInterval(handle));
  }

  setTimes(...loopTimes: number[][]): void {
    this.times = mergeTimes(loopTimes);
    if (!this.times.length) {
      this.tick = 0;
      this.playingTime.set(null);
    }
  }

  private advance(): void {
    if (!this.times.length) return;
    const cycleTicks = this.times.length + NEWEST_FRAME_TICKS - 1;
    this.tick = (this.tick + 1) % cycleTicks;
    this.playingTime.set(this.times[Math.min(this.tick, this.times.length - 1)]);
  }
}
