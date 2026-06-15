import { Service, effect, signal } from '@angular/core';

const STORAGE_KEY = 'meteo.particle-tuning.v2';

interface StoredSettings {
  cellSizePx: number;
  speedFactor: number;
  widthScale: number;
}

@Service()
export class ParticleSettings {
  cellSizePx = signal(70);
  speedFactor = signal(1);
  widthScale = signal(1);

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<StoredSettings>;
      this.cellSizePx.set(parsed.cellSizePx ?? 70);
      this.speedFactor.set(parsed.speedFactor ?? 1);
      this.widthScale.set(parsed.widthScale ?? 1);
    }
    effect(() => {
      const snapshot: StoredSettings = {
        cellSizePx: this.cellSizePx(),
        speedFactor: this.speedFactor(),
        widthScale: this.widthScale(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    });
  }
}
