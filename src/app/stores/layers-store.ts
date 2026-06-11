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

  setOpacity(id: string, opacity: number): void {
    this.states.update((states) =>
      states.map((state) => (state.id === id ? { ...state, opacity } : state)),
    );
  }

  move(id: string, direction: -1 | 1): void {
    this.states.update((states) => {
      const ordered = [...states].sort((a, b) => a.order - b.order);
      const index = ordered.findIndex((state) => state.id === id);
      const neighborIndex = index + direction;
      if (index < 0 || neighborIndex < 0 || neighborIndex >= ordered.length) return states;
      const reordered = [...ordered];
      [reordered[index], reordered[neighborIndex]] = [reordered[neighborIndex], reordered[index]];
      return states.map((state) => ({
        ...state,
        order: reordered.findIndex((entry) => entry.id === state.id),
      }));
    });
  }

  toggleHoverReadout(): void {
    this.hoverReadoutEnabled.update((enabled) => !enabled);
  }
}
