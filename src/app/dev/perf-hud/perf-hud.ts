import { Component, inject, signal } from '@angular/core';
import {
  ParticleSettings,
  SpeedCurve,
  SpeedReference,
} from '../../settings/particle-settings';
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
  particles = inject(ParticleSettings);
  visible = signal(new URLSearchParams(location.search).get('hud') === '1');
  fps = signal(0);
  heapMb = signal(0);
  speedReferenceOptions: SpeedReference[] = ['view', 'data', 'fixed'];
  speedCurveOptions: SpeedCurve[] = ['linear', 'floor', 'sqrt', 'windy'];

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

  setCellSize(event: Event): void {
    this.particles.cellSizePx.set(Number((event.target as HTMLInputElement).value));
  }

  setTextureCap(event: Event): void {
    this.quality.textureMaxDimension.set(Number((event.target as HTMLSelectElement).value));
  }

  setSpeedReference(event: Event): void {
    this.particles.speedReference.set((event.target as HTMLSelectElement).value as SpeedReference);
  }

  setSpeedCurve(event: Event): void {
    this.particles.speedCurve.set((event.target as HTMLSelectElement).value as SpeedCurve);
  }

  setSpeedFactor(event: Event): void {
    this.particles.speedFactor.set(Number((event.target as HTMLInputElement).value));
  }

  setWidthScale(event: Event): void {
    this.particles.widthScale.set(Number((event.target as HTMLInputElement).value));
  }
}
