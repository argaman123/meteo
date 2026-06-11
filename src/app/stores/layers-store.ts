import { Service, signal } from '@angular/core';
import { layerRegistry } from '../layers/registry';

export interface LayerUiState {
  id: string;
  active: boolean;
  opacity: number;
  order: number;
}

@Service()
export class LayersStore {
  readonly states = signal<LayerUiState[]>(
    layerRegistry.map((entry, index) => ({
      id: entry.id,
      active: entry.defaultActive,
      opacity: entry.defaultOpacity,
      order: index,
    })),
  );
  readonly hoverReadoutEnabled = signal(true);

  stateOf(id: string): LayerUiState | undefined {
    return this.states().find((state) => state.id === id);
  }

  toggle(id: string): void {
    this.states.update((states) =>
      states.map((state) => (state.id === id ? { ...state, active: !state.active } : state)),
    );
  }

  toggleHoverReadout(): void {
    this.hoverReadoutEnabled.update((enabled) => !enabled);
  }
}
