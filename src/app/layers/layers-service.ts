import { Injector, Service, Signal, effect, inject, signal } from '@angular/core';
import { LookKind } from '../engine/base/look';
import { MapService } from '../engine/map-service';
import { Overlay } from '../engine/overlay';
import { TimeService } from '../services/time-service';
import { Inputs, Layer, LookEntry } from './base/layer';
import { Shortcut } from './base/shortcut';

@Service()
export class LayersService {
  private injector = inject(Injector);
  private overlay = inject(Overlay);
  private map = inject(MapService);
  private time = inject(TimeService);

  readonly activeLayers = signal(new Map<Layer<unknown>, Signal<unknown>>());
  readonly activeLooks = signal(new Set<LookEntry>());

  private inputs: Inputs = {
    bbox: () => this.map.settledBbox(),
    time: () => this.time.currentTime(),
  };

  private draw = effect(() => {
    for (const [layer, dataSignal] of this.activeLayers()) {
      const data = dataSignal();
      if (data === undefined) continue;
      for (const entry of layer.looks) {
        if (this.activeLooks().has(entry)) this.overlay.draw(entry.look, data);
      }
    }
  });

  isLayerActive(layer: Layer<unknown>): boolean {
    return this.activeLayers().has(layer);
  }

  toggleLayer(layer: Layer<unknown>): void {
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

  showLayer(layer: Layer<unknown>): void {
    this.activeLayers.update((current) =>
      new Map(current).set(layer, layer.fetch(this.inputs, this.injector)),
    );
    for (const entry of layer.looks) {
      if (entry.checked) this.showLook(entry);
    }
    this.syncTimeWindows();
  }

  hideLayer(layer: Layer<unknown>): void {
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
}
