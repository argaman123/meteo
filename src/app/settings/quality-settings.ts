import { Service, effect, signal } from '@angular/core';

const STORAGE_KEY = 'meteo.quality.v4';

interface StoredQuality {
  textureMaxDimension: number;
}

@Service()
export class QualitySettings {
  textureMaxDimension = signal(2048);
  textureMaxDimensionOptions = [512, 1024, 2048, 4096];

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as StoredQuality;
      this.textureMaxDimension.set(parsed.textureMaxDimension);
    }
    effect(() => {
      const snapshot: StoredQuality = { textureMaxDimension: this.textureMaxDimension() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    });
  }
}
