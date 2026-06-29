import { Injector, Service, Signal, effect, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { MapService } from '../engine/map-service';
import { Overlay } from '../engine/overlay';
import { Grid } from '../objects/grid';
import { Wrap } from '../types/wrap';
import { Inputs, Layer } from './layer';
import { defaultActive } from './registry';

@Service()
export class LayersService {
  private injector = inject(Injector);
  private overlay = inject(Overlay);
  private map = inject(MapService);

  readonly enabledLayers = signal(new Map<Layer, Signal<Grid | undefined>>());

  private inputs: Inputs = {
    bbox: () => this.map.settledBbox(),
  };

  private draw = effect(() => {
    for (const [layer, gridSignal] of this.enabledLayers()) {
      const grid = gridSignal();
      if (!grid) continue;
      for (const look of layer.looks) this.overlay.draw(look, grid);
    }
  });

  showDefaults(): void {
    for (const layer of defaultActive) this.show(layer);
  }

  isShown(layer: Layer): boolean {
    return this.enabledLayers().has(layer);
  }

  toggle(layer: Layer): void {
    if (this.isShown(layer)) this.hide(layer);
    else this.show(layer);
  }

  private show(layer: Layer): void {
    this.enabledLayers.update((current) => new Map(current).set(layer, this.fetch(layer)));
  }

  private hide(layer: Layer): void {
    for (const look of layer.looks) this.overlay.remove(look);
    this.enabledLayers.update((current) => {
      const next = new Map(current);
      next.delete(layer);
      return next;
    });
  }

  private fetch(layer: Layer): Signal<Grid | undefined> {
    return httpResource<Grid>(() => layer.request(this.inputs), {
      parse: (raw) => layer.parse(raw as Wrap),
      injector: this.injector,
    }).value;
  }
}
