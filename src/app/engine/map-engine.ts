import { Service, effect, inject, signal } from '@angular/core';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Layer } from '@deck.gl/core';
import { LayerDefinition, ParticleLayerDefinition } from '../layers/layer-definition';
import { QualitySettings } from '../settings/quality-settings';
import { Bounds } from '../types/field-grid';
import { renderColormapLayer } from './renderers/colormap-renderer';
import { WindDashField, renderParticleLayer } from './renderers/particle-renderer';
import { BasemapId, loadBasemapStyle } from './style-loader';

export type { BasemapId } from './style-loader';

@Service()
export class MapEngine {
  private quality = inject(QualitySettings);
  private map: maplibregl.Map | null = null;
  private overlay: MapboxOverlay | null = null;
  private definitions = new Map<string, LayerDefinition>();
  private dashFields = new Map<string, WindDashField>();
  private animationFrame: number | null = null;

  readonly viewBounds = signal<Bounds | null>(null);
  readonly zoom = signal<number | null>(null);
  readonly cursor = signal<{ point: [number, number]; lngLat: [number, number] } | null>(null);

  constructor() {
    effect(() => {
      this.quality.particleCount();
      this.quality.textureMaxDimension();
      this.syncLayers();
    });
  }

  async init(container: HTMLElement, basemap: BasemapId): Promise<void> {
    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);
    void maplibregl.setRTLTextPlugin('/basemaps/rtl/mapbox-gl-rtl-text.js', true);
    const style = await loadBasemapStyle(basemap);
    this.map = new maplibregl.Map({
      container,
      style,
      center: [35, 31],
      zoom: 4,
      attributionControl: false,
    });
    this.map.keyboard.disable();
    this.map.on('style.load', () => this.syncLayers());
    this.map.on('move', () => this.publishView());
    this.map.on('mousemove', (event) => {
      this.cursor.set({
        point: [event.point.x, event.point.y],
        lngLat: [event.lngLat.lng, event.lngLat.lat],
      });
    });
    this.map.getCanvasContainer().addEventListener('mouseleave', () => this.cursor.set(null));
    this.publishView();
  }

  async setBasemap(id: BasemapId): Promise<void> {
    const style = await loadBasemapStyle(id);
    this.map?.setStyle(style);
  }

  addLayer(definition: LayerDefinition): void {
    this.definitions.set(definition.entry.id, definition);
    this.syncLayers();
    this.updateAnimationLoop();
  }

  removeLayer(id: string): void {
    this.definitions.delete(id);
    this.syncLayers();
    this.updateAnimationLoop();
  }

  flyToBounds(bounds: Bounds): void {
    this.map?.fitBounds(
      [
        [bounds[0], bounds[1]],
        [bounds[2], bounds[3]],
      ],
      { padding: 40 },
    );
  }

  destroy(): void {
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
    this.dashFields.clear();
    this.overlay = null;
    this.definitions.clear();
    this.map?.remove();
    this.map = null;
    this.viewBounds.set(null);
    this.zoom.set(null);
    this.cursor.set(null);
    maplibregl.removeProtocol('pmtiles');
  }

  private publishView(): void {
    if (!this.map) return;
    const bounds = this.map.getBounds();
    this.viewBounds.set([
      Math.max(-180, bounds.getWest()),
      bounds.getSouth(),
      Math.min(180, bounds.getEast()),
      bounds.getNorth(),
    ]);
    this.zoom.set(this.map.getZoom());
  }

  private syncLayers(): void {
    if (!this.map) return;
    if (!this.overlay) {
      this.overlay = new MapboxOverlay({ interleaved: true, layers: [] });
      this.map.addControl(this.overlay as unknown as maplibregl.IControl);
    }
    this.overlay.setProps({
      layers: [...this.definitions.values()]
        .sort((a, b) => a.order - b.order)
        .map((definition) => this.toDeckLayer(definition)),
    });
  }

  private toDeckLayer(definition: LayerDefinition): Layer {
    if ('grid' in definition) {
      return renderColormapLayer(definition, this.quality.textureMaxDimension());
    }
    return renderParticleLayer(definition, this.dashField(definition));
  }

  private dashField(definition: ParticleLayerDefinition): WindDashField {
    const id = definition.entry.id;
    const existing = this.dashFields.get(id);
    const maxDashCount = this.quality.particleCount();
    if (existing && existing.wind === definition.wind && existing.maxDashCount === maxDashCount) {
      return existing;
    }
    const field = new WindDashField(definition.wind, maxDashCount);
    this.updateDashField(field, performance.now());
    this.dashFields.set(id, field);
    return field;
  }

  private updateDashField(field: WindDashField, nowMs: number): void {
    const view = this.viewBounds() ?? field.wind.bounds;
    const widthPixels = this.map?.getCanvas().clientWidth ?? 1;
    field.update(view, widthPixels, nowMs / 1000);
  }

  private animate = (nowMs: number): void => {
    for (const [id, field] of this.dashFields) {
      if (!this.definitions.has(id)) {
        this.dashFields.delete(id);
        continue;
      }
      this.updateDashField(field, nowMs);
    }
    this.syncLayers();
    this.animationFrame = requestAnimationFrame(this.animate);
  };

  private updateAnimationLoop(): void {
    const hasParticles = [...this.definitions.values()].some((definition) => 'wind' in definition);
    if (hasParticles && this.animationFrame === null) {
      this.animationFrame = requestAnimationFrame(this.animate);
    }
    if (!hasParticles && this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
}
