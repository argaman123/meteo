import { Component, DestroyRef, effect, inject, signal } from '@angular/core';

@Component({
  selector: 'app-perf-hud',
  templateUrl: './perf-hud.html',
  host: { '(window:keydown)': 'onKey($event)' },
})
export class PerfHud {
  protected visible = signal(new URLSearchParams(location.search).get('hud') === '1');
  protected fps = signal(0);
  protected heapMb = signal<number | null>(null);
  private frameHandle = 0;

  constructor() {
    effect(() => {
      cancelAnimationFrame(this.frameHandle);
      if (this.visible()) this.startLoop();
    });
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.frameHandle));
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.ctrlKey && event.altKey && event.code === 'KeyP') this.visible.update((on) => !on);
  }

  private startLoop(): void {
    let frames = 0;
    let windowStart = performance.now();
    const tick = (now: number) => {
      frames++;
      if (now - windowStart >= 500) {
        this.fps.set(Math.round((frames * 1000) / (now - windowStart)));
        frames = 0;
        windowStart = now;
        const memory = (performance as { memory?: { usedJSHeapSize: number } }).memory;
        this.heapMb.set(memory ? Math.round(memory.usedJSHeapSize / 1048576) : null);
      }
      this.frameHandle = requestAnimationFrame(tick);
    };
    this.frameHandle = requestAnimationFrame(tick);
  }
}
