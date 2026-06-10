import { Service, signal } from '@angular/core';

@Service()
export class QualitySettings {
  particleCount = signal(5000);
  textureMaxDimension = signal(2048);
}
