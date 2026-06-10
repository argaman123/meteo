import { Component, inject, signal } from '@angular/core';
import { QualitySettings } from '../../core/quality-settings';

interface MemoryInfo {
  usedJSHeapSize: number;
}

@Component({
  selector: 'app-perf-hud',
  host: { '(document:keydown.control.alt.p)': 'toggle()' },
  template: `
    @if (visible()) {
      <div
        class="absolute bottom-3 start-3 z-10 rounded-md border border-panel-border bg-panel/90 p-3 font-mono text-xs"
        dir="ltr"
      >
        <div>FPS: {{ fps() }}</div>
        <div>Heap: {{ heapMb() }} MB</div>
        <label class="mt-2 block">
          Particles
          <select
            class="ms-1 rounded border border-panel-border bg-app"
            [value]="quality.particleCount()"
            (change)="setParticles($event)"
          >
            @for (option of quality.particleCountOptions; track option) {
              <option [value]="option" [selected]="option === quality.particleCount()">
                {{ option }}
              </option>
            }
          </select>
        </label>
        <label class="mt-1 block">
          Texture cap
          <select
            class="ms-1 rounded border border-panel-border bg-app"
            [value]="quality.textureMaxDimension()"
            (change)="setTextureCap($event)"
          >
            @for (option of quality.textureMaxDimensionOptions; track option) {
              <option [value]="option" [selected]="option === quality.textureMaxDimension()">
                {{ option }}
              </option>
            }
          </select>
        </label>
      </div>
    }
  `,
})
export class PerfHud {
  quality = inject(QualitySettings);
  visible = signal(false);
  fps = signal(0);
  heapMb = signal(0);

  constructor() {
    let frames = 0;
    let windowStart = performance.now();
    const tick = (now: number) => {
      frames++;
      if (now - windowStart >= 1000) {
        this.fps.set(frames);
        frames = 0;
        windowStart = now;
        const memory = (performance as Performance & { memory?: MemoryInfo }).memory;
        if (memory) this.heapMb.set(Math.round(memory.usedJSHeapSize / 1048576));
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  toggle(): void {
    this.visible.update((value) => !value);
  }

  setParticles(event: Event): void {
    this.quality.particleCount.set(Number((event.target as HTMLSelectElement).value));
  }

  setTextureCap(event: Event): void {
    this.quality.textureMaxDimension.set(Number((event.target as HTMLSelectElement).value));
  }
}
