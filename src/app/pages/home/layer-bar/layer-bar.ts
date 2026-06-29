import { Component, inject } from '@angular/core';
import { LayersService } from '../../../layers/layers-service';
import { layers } from '../../../layers/registry';

@Component({
  selector: 'app-layer-bar',
  templateUrl: './layer-bar.html',
  styleUrl: './layer-bar.css',
})
export class LayerBar {
  protected readonly layers = layers;
  protected readonly service = inject(LayersService);
}
