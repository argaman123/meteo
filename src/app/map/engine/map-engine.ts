import { Service } from '@angular/core';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';

export type BasemapId = 'dark' | 'light' | 'colorful';
export type ViewMode = 'globe' | 'flat';

@Service()
export class MapEngine {
  private map: maplibregl.Map | null = null;
  private viewMode: ViewMode = 'globe';

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
    this.map.on('style.load', () => this.applyProjection());
  }

  async setBasemap(id: BasemapId): Promise<void> {
    const style = await this.loadStyle(id);
    this.map?.setStyle(style);
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    this.applyProjection();
  }

  destroy(): void {
    this.map?.remove();
    this.map = null;
    maplibregl.removeProtocol('pmtiles');
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
