import { Service } from '@angular/core';
import maplibregl from 'maplibre-gl';
import { Look, LookKind } from './base/look';
import { FeatureSource } from './maplibre/feature-source';
import { OverlayRenderer } from './maplibre/overlay-renderer';

// TODO: UNVERIFIED CODE BELOW
const BORDERS_LAYER = 'coastline';

@Service()
export class OverlayService {
  private map: maplibregl.Map | null = null;
  private styleReady = false;
  private renderers = new Map<Look<unknown>, OverlayRenderer[]>();
  private sources = new Map<Look<unknown>, FeatureSource>();
  private ids = new Map<Look<unknown>, string>();
  private counter = 0;
  private rendererCounter = 0;

  attach(map: maplibregl.Map): void {
    this.map = map;
    this.styleReady = map.isStyleLoaded() === true;
    map.on('styledataloading', () => (this.styleReady = false));
    map.on('webglcontextlost', () => (this.styleReady = false));
    map.on('style.load', () => this.restore());
  }

  detach(): void {
    for (const look of [...this.renderers.keys()]) this.remove(look);
    this.map = null;
    this.renderers.clear();
    this.sources.clear();
    this.ids.clear();
    this.counter = 0;
  }

  draw(look: Look<unknown>, data: unknown): void {
    const map = this.map;
    if (!map) return;
    const id = this.idFor(look);
    let source = this.sources.get(look);
    if (!source) {
      source = new FeatureSource(map, `look-${id}`);
      this.sources.set(look, source);
    }
    const overlays = look.buildLook(look.provider.provide(data));
    const previous = this.renderers.get(look) ?? [];
    const renderers = overlays.map((overlay, index) => {
      const kept = previous[index];
      if (kept?.isFor(overlay)) return kept;
      kept?.destroy();
      return overlay.createRenderer(map, `look-${id}-${this.rendererCounter++}`, source);
    });
    for (const stale of previous.slice(overlays.length)) stale.destroy();
    overlays.forEach((overlay, index) => renderers[index].setOverlay(overlay));
    this.renderers.set(look, renderers);
    if (!this.styleReady) return;
    for (const renderer of renderers) renderer.stage();
    source.commit();
    for (const renderer of renderers) renderer.show();
    this.order();
  }

  remove(look: Look<unknown>): void {
    const renderers = this.renderers.get(look);
    if (!renderers) return;
    for (const renderer of renderers) renderer.destroy();
    this.sources.get(look)?.destroy();
    this.renderers.delete(look);
    this.sources.delete(look);
    look.release();
  }

  private restore(): void {
    this.styleReady = true;
    for (const [look, renderers] of this.renderers) {
      for (const renderer of renderers) renderer.stage();
      this.sources.get(look)?.commit();
      for (const renderer of renderers) renderer.restore();
    }
    this.order();
  }

  private order(): void {
    const map = this.map;
    if (!map || !this.styleReady) return;
    const ranked = [...this.renderers.entries()].sort(([a], [b]) => a.kind - b.kind);
    const underBorders = map.getLayer(BORDERS_LAYER) ? BORDERS_LAYER : undefined;
    for (const [look, renderers] of ranked) {
      const beforeId = look.kind < LookKind.Borders ? underBorders : undefined;
      for (const renderer of renderers) {
        for (const layerId of renderer.layerIds()) {
          if (map.getLayer(layerId)) map.moveLayer(layerId, beforeId);
        }
      }
    }
  }

  private idFor(look: Look<unknown>): string {
    let id = this.ids.get(look);
    if (id === undefined) {
      id = String(this.counter++);
      this.ids.set(look, id);
    }
    return id;
  }
}
