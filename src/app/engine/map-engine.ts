import { Service, effect, inject } from '@angular/core';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Layer } from '@deck.gl/core';
import { LayerDefinition } from '../layers/layer-definition';
import { QualitySettings } from '../settings/quality-settings';
import { renderColormapLayer } from './renderers/colormap-renderer';
import { renderParticleLayer } from './renderers/particle-renderer';
import { BasemapId, loadBasemapStyle } from './style-loader';

export type { BasemapId } from './style-loader';
export type ViewMode = 'globe' | 'flat';

@Service()
export class MapEngine {
  private quality = inject(QualitySettings);
  private map: maplibregl.Map | null = null;
  private overlay: MapboxOverlay | null = null;
  private definitions = new Map<string, LayerDefinition>();
  private viewMode: ViewMode = 'globe';

  constructor() {
    effect(() => {
      this.quality.particleCount();
      this.quality.textureMaxDimension();
      this.syncLayers();
    });
  }

  async init(container: HTMLElement, basemap: BasemapId, viewMode: ViewMode): Promise<void> {
    this.viewMode = viewMode;
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
    this.map.on('style.load', () => {
      this.applyProjection();
      this.syncLayers();
    });
  }

  async setBasemap(id: BasemapId): Promise<void> {
    const style = await loadBasemapStyle(id);
    this.map?.setStyle(style);
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    this.applyProjection();
    this.syncLayers();
  }

  addLayer(definition: LayerDefinition): void {
    this.definitions.set(definition.id, definition);
    this.syncLayers();
  }

  removeLayer(id: string): void {
    this.definitions.delete(id);
    this.syncLayers();
  }

  destroy(): void {
    this.overlay = null;
    this.definitions.clear();
    this.map?.remove();
    this.map = null;
    maplibregl.removeProtocol('pmtiles');
  }

  private syncLayers(): void {
    if (!this.map) return;
    if (!this.overlay) {
      this.overlay = new MapboxOverlay({ interleaved: true, layers: [] });
      this.map.addControl(this.overlay as unknown as maplibregl.IControl);
    }
    this.overlay.setProps({
      layers: [...this.definitions.values()].map((definition) => this.toDeckLayer(definition)),
    });
  }

  private toDeckLayer(definition: LayerDefinition): Layer {
    if (definition.type === 'colormap') {
      return renderColormapLayer(definition, this.quality.textureMaxDimension());
    }
    return renderParticleLayer(definition, this.quality.particleCount());
  }

  private applyProjection(): void {
    this.map?.setProjection({ type: this.viewMode === 'globe' ? 'globe' : 'mercator' });
  }
}
