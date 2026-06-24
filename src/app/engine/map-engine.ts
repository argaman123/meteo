import { Service, inject } from '@angular/core';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { ViewStore } from '../stores/view-store';
import { Overlay } from './overlay';

export type BasemapId = 'dark' | 'light' | 'colorful';

@Service()
export class MapEngine {
  private view = inject(ViewStore);
  private overlay = inject(Overlay);
  private map: maplibregl.Map | null = null;

  async init(container: HTMLElement, basemap: BasemapId): Promise<void> {
    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);
    void maplibregl.setRTLTextPlugin('/basemaps/rtl/mapbox-gl-rtl-text.js', true);
    const style = await this.loadBasemapStyle(basemap);
    this.map = new maplibregl.Map({
      container,
      style,
      center: [35, 31],
      zoom: 4,
      minZoom: Math.max(0, Math.log2(container.clientWidth / 512)),
      attributionControl: false,
    });
    this.map.keyboard.disable();
    this.map.on('move', () => this.publishView());
    this.map.on('moveend', () => this.view.settledBbox.set(this.view.bbox()));
    this.map.on('mousemove', (event) => {
      this.view.cursor.set([event.lngLat.lng, event.lngLat.lat]);
    });
    this.map.getCanvasContainer().addEventListener('mouseleave', () => this.view.cursor.set(null));
    this.overlay.attach(this.map);
    this.publishView();
    this.view.settledBbox.set(this.view.bbox());
  }

  async setBasemap(id: BasemapId): Promise<void> {
    const style = await this.loadBasemapStyle(id);
    this.map?.setStyle(style);
  }

  destroy(): void {
    this.overlay.detach();
    this.map?.remove();
    this.map = null;
    this.view.bbox.set(null);
    this.view.settledBbox.set(null);
    this.view.zoom.set(null);
    this.view.cursor.set(null);
    maplibregl.removeProtocol('pmtiles');
  }

  private publishView(): void {
    if (!this.map) return;
    const bounds = this.map.getBounds();
    this.view.bbox.set([
      Math.max(-180, bounds.getWest()),
      bounds.getSouth(),
      Math.min(180, bounds.getEast()),
      bounds.getNorth(),
    ]);
    this.view.zoom.set(this.map.getZoom());
  }

  private async loadBasemapStyle(id: BasemapId): Promise<maplibregl.StyleSpecification> {
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
}
