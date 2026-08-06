import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { LayersService } from '../../layers/layers-service';
import { formatLocalTime } from '../../utils/time';

const hourFormat = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' });

@Component({
  selector: 'app-perf-hud',
  templateUrl: './perf-hud.html',
  host: { '(window:keydown)': 'onKey($event)' },
})
export class PerfHud {
  private layersService = inject(LayersService);

  protected visible = signal(true);
  protected fps = signal(0);
  protected heapMb = signal<number | null>(null);
  private frameHandle = 0;

  protected layerTimes = computed(() => {
    const lines: { name: string; time: string; relevant: boolean }[] = [];
    for (const [layer, dataSignal] of this.layersService.activeLayers()) {
      if (!layer.timeWindow) continue;
      const data = dataSignal();
      const relevant = data !== null;
      const range = data === undefined || data === null ? null : layer.relevanceOf(data);
      lines.push({
        name: layer.name,
        time: !relevant
          ? '—'
          : range === null || range === true
            ? '…'
            : `${formatLocalTime(range.start)} – ${hourFormat.format(range.end)}`,
        relevant,
      });
    }
    return lines;
  });

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
