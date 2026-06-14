import { Service, effect, signal } from '@angular/core';

const STORAGE_KEY = 'meteo.particle-tuning.v2';

export type SpeedReference = 'view' | 'data' | 'fixed';
export type SpeedCurve = 'linear' | 'floor' | 'sqrt' | 'windy';

export interface ParticleTuning {
  speedReference: SpeedReference;
  latitudeCorrection: boolean;
  speedCurve: SpeedCurve;
  speedFactor: number;
  widthScale: number;
}

interface StoredTuning extends ParticleTuning {
  version: 2;
  cellSizePx: number;
}

@Service()
export class ParticleSettings {
  cellSizePx = signal(70);
  showGrid = signal(false);
  speedReference = signal<SpeedReference>('data');
  latitudeCorrection = signal(false);
  speedCurve = signal<SpeedCurve>('floor');
  speedFactor = signal(1);
  widthScale = signal(1);

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as StoredTuning;
      this.cellSizePx.set(parsed.cellSizePx ?? 70);
      this.speedReference.set(parsed.speedReference);
      this.latitudeCorrection.set(parsed.latitudeCorrection);
      this.speedCurve.set(parsed.speedCurve);
      this.speedFactor.set(parsed.speedFactor);
      this.widthScale.set(parsed.widthScale ?? 1);
    }
    effect(() => {
      const snapshot: StoredTuning = {
        version: 2,
        cellSizePx: this.cellSizePx(),
        ...this.tuning(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    });
  }

  tuning(): ParticleTuning {
    return {
      speedReference: this.speedReference(),
      latitudeCorrection: this.latitudeCorrection(),
      speedCurve: this.speedCurve(),
      speedFactor: this.speedFactor(),
      widthScale: this.widthScale(),
    };
  }
}
