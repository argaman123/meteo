import { Service, effect, signal } from '@angular/core';

const STORAGE_KEY = 'meteo.quality.v3';

interface StoredQuality {
  particleCount: number;
  textureMaxDimension: number;
}

@Service()
export class QualitySettings {
  particleCount = signal(2000);
  textureMaxDimension = signal(2048);
  particleCountOptions = [500, 1000, 2000, 3000, 5000, 20000];
  textureMaxDimensionOptions = [512, 1024, 2048, 4096];

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as StoredQuality;
      this.particleCount.set(parsed.particleCount);
      this.textureMaxDimension.set(parsed.textureMaxDimension);
    }
    effect(() => {
      const snapshot: StoredQuality = {
        particleCount: this.particleCount(),
        textureMaxDimension: this.textureMaxDimension(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    });
  }
}
