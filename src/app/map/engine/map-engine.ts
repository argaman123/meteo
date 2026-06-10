import { Service, effect, inject } from '@angular/core';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Layer } from '@deck.gl/core';
import { ParticleLayer, RasterLayer } from 'weatherlayers-gl';
import { QualitySettings } from '../../core/quality-settings';
import { downsampleGrid } from '../layers/field-grid';
import { LayerDefinition } from '../layers/layer-definition';

export type BasemapId = 'dark' | 'light' | 'colorful';
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

  async init(container: HTMLElement, basemap: BasemapId): Promise<void> {
    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);
    void maplibregl.setRTLTextPlugin('/basemaps/rtl/mapbox-gl-rtl-text.js', true);
    const style = await this.loadStyle(basemap);
    this.map = new maplibregl.Map({
      container,
      style,
      center: [35, 31],
      zoom: 4,
    });
    this.map.on('style.load', () => {
      this.applyProjection();
      this.syncLayers();
    });
  }

  async setBasemap(id: BasemapId): Promise<void> {
    const style = await this.loadStyle(id);
    this.map?.setStyle(style);
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    this.applyProjection();
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
      const grid = downsampleGrid(definition.grid, this.quality.textureMaxDimension());
      return new RasterLayer({
        id: definition.id,
        image: { data: grid.data, width: grid.width, height: grid.height },
        imageType: 'SCALAR',
        bounds: grid.bounds,
        palette: definition.palette.map((stop) => [stop.value, stop.color] as [number, string]),
        opacity: definition.opacity,
      });
    }
    const wind = definition.wind;
    return new ParticleLayer({
      id: definition.id,
      image: { data: wind.data, width: wind.width, height: wind.height },
      imageType: 'VECTOR',
      bounds: wind.bounds,
      numParticles: this.quality.particleCount(),
      opacity: definition.opacity,
    });
  }

  private async loadStyle(id: BasemapId): Promise<maplibregl.StyleSpecification> {
    const response = await fetch(`/basemaps/styles/${id}.json`);
    const style = (await response.json()) as maplibregl.StyleSpecification;
    if (typeof style.sprite === 'string' && style.sprite.startsWith('/')) {
      style.sprite = location.origin + style.sprite;
    }
    if (style.glyphs?.startsWith('/')) {
      style.glyphs = location.origin + style.glyphs;
    }
    for (const source of Object.values(style.sources)) {
      if ('url' in source && source.url?.startsWith('pmtiles:///')) {
        source.url = `pmtiles://${location.origin}/${source.url.slice('pmtiles:///'.length)}`;
      }
    }
    return style;
  }

  private applyProjection(): void {
    this.map?.setProjection({ type: this.viewMode === 'globe' ? 'globe' : 'mercator' });
  }
}
