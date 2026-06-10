import { Component, inject, signal } from '@angular/core';
import { QualitySettings } from '../../settings/quality-settings';

interface MemoryInfo {
  usedJSHeapSize: number;
}

@Component({
  selector: 'app-perf-hud',
  host: { '(document:keydown.control.alt.p)': 'toggle()' },
  templateUrl: './perf-hud.html',
  styleUrl: './perf-hud.css',
})
export class PerfHud {
  quality = inject(QualitySettings);
  visible = signal(new URLSearchParams(location.search).get('hud') === '1');
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
