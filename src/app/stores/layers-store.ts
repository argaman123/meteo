import { Service, signal } from '@angular/core';
import { Layer } from '../layers/layer';
import { defaultActive } from '../layers/registry';

@Service()
export class LayersStore {
  private readonly active = signal(new Set<Layer>(defaultActive));

  isActive(layer: Layer): boolean {
    return this.active().has(layer);
  }

  toggle(layer: Layer): void {
    this.active.update((current) => {
      const next = new Set(current);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  }
}
