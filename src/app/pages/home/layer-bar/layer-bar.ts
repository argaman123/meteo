import { Component, computed, inject } from '@angular/core';
import { layerRegistry } from '../../../layers/registry';
import { LayersStore } from '../../../stores/layers-store';

@Component({
  selector: 'app-layer-bar',
  templateUrl: './layer-bar.html',
  styleUrl: './layer-bar.css',
})
export class LayerBar {
  store = inject(LayersStore);
  rows = computed(() =>
    [...this.store.states()]
      .sort((a, b) => a.order - b.order)
      .map((state) => ({ state, entry: layerRegistry.find((entry) => entry.id === state.id)! })),
  );
}
