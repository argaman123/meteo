import { Injector, Service, Signal, computed, effect, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { LookKind } from '../engine/base/look';
import { MapService } from '../engine/map-service';
import { Overlay } from '../engine/overlay';
import { Grid } from '../objects/grid';
import { TimeService } from '../services/time-service';
import { Wrap } from '../types/wrap';
import { Inputs, Layer, LookEntry } from './base/layer';
import { Shortcut } from './base/shortcut';

@Service()
export class LayersService {
  private injector = inject(Injector);
  private overlay = inject(Overlay);
  private map = inject(MapService);
  private time = inject(TimeService);

  readonly activeLayers = signal(new Map<Layer, Signal<Grid[] | undefined>>());
  readonly activeLooks = signal(new Set<LookEntry>());

  private inputs: Inputs = {
    bbox: () => this.map.settledBbox(),
    time: () => this.time.currentTime(),
  };

  private draw = effect(() => {
    for (const [layer, gridsSignal] of this.activeLayers()) {
      const grids = gridsSignal();
      if (!grids) continue;
      for (const entry of layer.looks) {
        if (this.activeLooks().has(entry)) this.overlay.draw(entry.look, grids);
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

  isLookActive(entry: LookEntry): boolean {
    return this.activeLooks().has(entry);
  }

  toggleLook(entry: LookEntry): void {
    if (this.isLookActive(entry)) this.hideLook(entry);
    else this.showLook(entry);
  }

  isShortcutActive(shortcut: Shortcut): boolean {
    return shortcut.parts.every(({ layer }) => this.isLayerActive(layer));
  }

  toggleShortcut(shortcut: Shortcut): void {
    if (this.isShortcutActive(shortcut)) this.hideShortcut(shortcut);
    else this.showShortcut(shortcut);
  }

  showShortcut(shortcut: Shortcut): void {
    for (const { layer } of shortcut.parts) {
      if (!this.isLayerActive(layer)) this.showLayer(layer);
    }
    for (const { layer, looks } of shortcut.parts) {
      for (const entry of layer.looks) {
        if (looks.includes(entry.look.kind)) this.showLook(entry);
        else this.hideLook(entry);
      }
    }
  }

  hideShortcut(shortcut: Shortcut): void {
    for (const { layer } of shortcut.parts) this.hideLayer(layer);
  }

  showLayer(layer: Layer): void {
    this.activeLayers.update((current) => new Map(current).set(layer, this.fetch(layer)));
    for (const entry of layer.looks) {
      if (entry.checked) this.showLook(entry);
    }
    this.syncTimeWindows();
  }

  hideLayer(layer: Layer): void {
    for (const entry of layer.looks) this.removeLook(entry);
    this.activeLayers.update((current) => {
      const next = new Map(current);
      next.delete(layer);
      return next;
    });
    this.syncTimeWindows();
  }

  private showLook(entry: LookEntry): void {
    if (entry.look.kind === LookKind.Colormap) {
      for (const active of this.activeLooks()) {
        if (active.look.kind === LookKind.Colormap) this.hideLook(active);
      }
    }
    this.activeLooks.update((current) => new Set(current).add(entry));
    entry.checked = true;
  }

  private hideLook(entry: LookEntry): void {
    this.removeLook(entry);
    entry.checked = false;
  }

  private removeLook(entry: LookEntry): void {
    this.overlay.remove(entry.look);
    this.activeLooks.update((current) => {
      const next = new Set(current);
      next.delete(entry);
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
