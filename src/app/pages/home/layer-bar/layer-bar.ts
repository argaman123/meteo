import { Component, inject } from '@angular/core';
import { layers } from '../../../layers/registry';
import { LayersStore } from '../../../stores/layers-store';

@Component({
  selector: 'app-layer-bar',
  templateUrl: './layer-bar.html',
  styleUrl: './layer-bar.css',
})
export class LayerBar {
  protected readonly layers = layers;
  protected readonly store = inject(LayersStore);
}
