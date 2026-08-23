import {
  EnvironmentInjector,
  Service,
  Signal,
  computed,
  createEnvironmentInjector,
  effect,
  inject,
  signal,
} from '@angular/core';
import { LookKind } from '../engine/base/look';
import { MapService } from '../engine/map-service';
import { Overlay } from '../engine/overlay';
import { LevelService } from '../services/level-service';
import { LoopPlayer } from '../services/loop-player';
import { TimeService } from '../services/time-service';
import { Inputs, Layer, LookEntry } from './base/layer';
import { LoopLayer } from './base/loop-layer';
import { Shortcut } from './base/shortcut';

@Service()
export class LayersService {
  private injector = inject(EnvironmentInjector);
  private overlay = inject(Overlay);
  private map = inject(MapService);
  private time = inject(TimeService);
  private level = inject(LevelService);
  private player = inject(LoopPlayer);
  private layerInjectors = new Map<Layer<unknown>, EnvironmentInjector>();

  readonly activeLayers = signal(new Map<Layer<unknown>, Signal<unknown>>());
  readonly activeLooks = signal(new Set<LookEntry>());

  readonly isLoading = computed(() =>
    [...this.activeLayers().values()].some((data) => data() === undefined),
  );

  private inputs: Inputs = {
    bbox: () => this.map.settledBbox(),
    displayTime: () => this.time.displayTime(),
    exactTime: () => this.time.exactTime(),
    window: () => this.time.window(),
    zoom: () => this.map.settledZoom() ?? 0,
    level: () => this.level.activeLevel(),
  };

  private syncLoops = effect(() => {
    const loopTimes: number[][] = [];
    for (const [layer, data] of this.activeLayers()) {
      if (!(layer instanceof LoopLayer)) continue;
      if (!layer.looks.some((entry) => this.activeLooks().has(entry))) continue;
      const value = data();
      if (value === undefined || value === null) continue;
      loopTimes.push(layer.loopTimesOf(value));
    }
    this.player.setTimes(...loopTimes);
  });

  private syncTime = effect(() => {
    const layers = [...this.activeLayers().keys()];
    this.time.windows.set(layers.map((layer) => layer.timeWindow).filter((window) => window !== null));
    this.time.setForcedTimes(...layers.map((layer) => layer.forcedTimes?.() ?? []));
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
    const layerInjector = createEnvironmentInjector([], this.injector);
    this.layerInjectors.set(layer, layerInjector);
    let data = this.keepIfRelevant(layer, layer.fetch(this.inputs, layerInjector));
    if (layer instanceof LoopLayer) data = this.playLoop(layer, data);
    this.activeLayers.update((current) => new Map(current).set(layer, data));
    effect(() => this.drawLayer(layer, data), { injector: layerInjector });
    for (const entry of layer.looks) {
      if (entry.checked) this.showLook(entry);
    }
  }

  private drawLayer(layer: Layer<unknown>, dataSignal: Signal<unknown>): void {
    const data = dataSignal();
    if (data === undefined) return;
    if (data === null) {
      for (const entry of layer.looks) this.overlay.remove(entry.look);
      return;
    }
    for (const entry of layer.looks) {
      if (this.activeLooks().has(entry)) this.overlay.draw(entry.look, data);
    }
  }

  hideLayer(layer: Layer<unknown>): void {
    for (const entry of layer.looks) this.removeLook(entry);
    this.activeLayers.update((current) => {
      const next = new Map(current);
      next.delete(layer);
      return next;
    });
    this.layerInjectors.get(layer)?.destroy();
    this.layerInjectors.delete(layer);
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

  private keepIfRelevant(layer: Layer<unknown>, data: Signal<unknown>): Signal<unknown> {
    return computed(() => {
      const value = data();
      if (value === undefined || value === null) return value;
      const range = layer.relevanceOf(value);
      if (range === true) return value;
      const time = this.time.exactTime();
      return time < range.start || time > range.end ? null : value;
    });
  }

  private playLoop(layer: LoopLayer<unknown>, data: Signal<unknown>): Signal<unknown> {
    return computed(() => {
      const value = data();
      const playing = this.player.loopTime();
      if (value === undefined || value === null || playing === null) return value;
      return layer.atTime(value, playing);
    });
  }

}
