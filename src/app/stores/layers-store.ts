import { Service, signal } from '@angular/core';
import { layerRegistry } from '../layers/registry';

const DEFAULT_ACTIVE = new Set(['wind']);

export interface LayerUiState {
  id: string;
  active: boolean;
  order: number;
}

@Service()
export class LayersStore {
  readonly states = signal<LayerUiState[]>(
    layerRegistry.map((layer, index) => ({
      id: layer.id,
      active: DEFAULT_ACTIVE.has(layer.id),
      order: index,
    })),
  );
  readonly hoverReadoutEnabled = signal(true);

  stateOf(id: string): LayerUiState | undefined {
    return this.states().find((state) => state.id === id);
  }

  toggle(id: string): void {
    const current = this.stateOf(id);
    if (!current) return;
    const target = !current.active;
    this.states.update((states) =>
      states.map((state) => {
        if (state.id === id) return { ...state, active: target };
        return target ? { ...state, active: false } : state;
      }),
    );
  }

  toggleHoverReadout(): void {
    this.hoverReadoutEnabled.update((enabled) => !enabled);
  }
}
