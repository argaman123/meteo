import { Component, inject } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import { Layer } from '../../../layers/layer';
import { LayersService } from '../../../layers/layers-service';
import { layers } from '../../../layers/registry';

@Component({
  selector: 'app-layer-bar',
  imports: [HlmButton],
  templateUrl: './layer-bar.html',
  styleUrl: './layer-bar.css',
})
export class LayerBar {
  protected readonly service = inject(LayersService);

  protected readonly menu: { layer: Layer; name: string }[] = [
    { layer: layers.temperature, name: 'טמפרטורה' },
    { layer: layers.wind, name: 'רוח' },
  ];
}
