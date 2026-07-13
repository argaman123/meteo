import { Injector, Service, Signal, computed, effect, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Look, LookKind } from '../engine/base/look';
import { MapService } from '../engine/map-service';
import { Overlay } from '../engine/overlay';
import { Grid } from '../objects/grid';
import { TimeService } from '../services/time-service';
import { Wrap } from '../types/wrap';
import { Inputs, Layer } from './layer';

@Service()
export class LayersService {
  private injector = inject(Injector);
  private overlay = inject(Overlay);
  private map = inject(MapService);
  private time = inject(TimeService);

  readonly activeLayers = signal(new Map<Layer, Signal<Grid[] | undefined>>());
  readonly activeLooks = signal(new Set<Look<unknown>>());

  private inputs: Inputs = {
    bbox: () => this.map.settledBbox(),
    time: () => this.time.currentTime(),
  };

  private draw = effect(() => {
    for (const [layer, gridsSignal] of this.activeLayers()) {
      const grids = gridsSignal();
      if (!grids) continue;
      for (const { look } of layer.looks) {
        if (this.activeLooks().has(look)) this.overlay.draw(look, grids);
      }
    }
  });

  isLayerActive(layer: Layer): boolean {
    return this.activeLayers().has(layer);
  }

  toggleLayer(layer: Layer): void {
    if (this.isLayerActive(layer)) this.hideLayer(layer);
    else this.showLayer(layer);
  }

  isLookActive(look: Look<unknown>): boolean {
    return this.activeLooks().has(look);
  }

  toggleLook(look: Look<unknown>): void {
    if (this.isLookActive(look)) this.hideLook(look);
    else this.showLook(look);
  }

  showLayer(layer: Layer): void {
    this.activeLayers.update((current) => new Map(current).set(layer, this.fetch(layer)));
    for (const { look, defaultOn } of layer.looks) {
      if (defaultOn) this.showLook(look);
    }
    this.syncTimeWindows();
  }

  hideLayer(layer: Layer): void {
    for (const { look } of layer.looks) this.hideLook(look);
    this.activeLayers.update((current) => {
      const next = new Map(current);
      next.delete(layer);
      return next;
    });
    this.syncTimeWindows();
  }

  private showLook(look: Look<unknown>): void {
    if (look.kind === LookKind.Colormap) {
      for (const shown of this.activeLooks()) {
        if (shown.kind === LookKind.Colormap) this.hideLook(shown);
      }
    }
    this.activeLooks.update((current) => new Set(current).add(look));
  }

  private hideLook(look: Look<unknown>): void {
    this.overlay.remove(look);
    this.activeLooks.update((current) => {
      const next = new Set(current);
      next.delete(look);
      return next;
    });
  }

  private syncTimeWindows(): void {
    this.time.windows.set([...this.activeLayers().keys()].map((layer) => layer.timeWindow));
  }

  private fetch(layer: Layer): Signal<Grid[] | undefined> {
    const wraps = layer.parameters.map(
      (parameter) =>
        httpResource<Wrap>(() => layer.request(parameter, this.inputs), {
          injector: this.injector,
        }).value,
    );
    return computed(() => {
      const loaded = wraps.map((wrap) => wrap());
      if (loaded.some((wrap) => wrap === undefined)) return undefined;
      return layer.parse(loaded as Wrap[]);
    });
  }
}
