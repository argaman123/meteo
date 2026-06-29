import { Service, inject, signal } from '@angular/core';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { Bounds } from '../types/wrap';
import { Overlay } from './overlay';

export type BasemapId = 'dark' | 'light' | 'colorful';

@Service()
export class MapService {
  private overlay = inject(Overlay);
  private map: maplibregl.Map | null = null;

  readonly bbox = signal<Bounds | null>(null);
  readonly settledBbox = signal<Bounds | null>(null);
  readonly zoom = signal<number | null>(null);
  readonly cursor = signal<[number, number] | null>(null);
  readonly basemap = signal<BasemapId>('dark');
  readonly basemaps: { id: BasemapId; label: string }[] = [
    { id: 'dark', label: 'כהה' },
    { id: 'light', label: 'בהיר' },
    { id: 'colorful', label: 'צבעוני' },
  ];

  async init(container: HTMLElement): Promise<void> {
    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);
    void maplibregl.setRTLTextPlugin('/basemaps/rtl/mapbox-gl-rtl-text.js', true);
    const style = await this.loadBasemapStyle(this.basemap());
    this.map = new maplibregl.Map({
      container,
      style,
      center: [35, 31],
      zoom: 4,
      minZoom: Math.max(0, Math.log2(container.clientWidth / 512)),
      attributionControl: false,
    });
    this.map.keyboard.disable();
    this.map.on('move', () => this.publish());
    this.map.on('moveend', () => this.settledBbox.set(this.bbox()));
    this.map.on('mousemove', (event) => {
      this.cursor.set([event.lngLat.lng, event.lngLat.lat]);
    });
    this.map.getCanvasContainer().addEventListener('mouseleave', () => this.cursor.set(null));
    this.overlay.attach(this.map);
    this.publish();
    this.settledBbox.set(this.bbox());
  }

  destroy(): void {
    this.overlay.detach();
    this.map?.remove();
    this.map = null;
    this.bbox.set(null);
    this.settledBbox.set(null);
    this.zoom.set(null);
    this.cursor.set(null);
    maplibregl.removeProtocol('pmtiles');
  }

  setBasemap(id: BasemapId): void {
    this.basemap.set(id);
    void this.applyStyle(id);
  }

  flyTo(center: [number, number], zoom?: number): void {
    this.map?.flyTo({ center, zoom });
  }

  private publish(): void {
    if (!this.map) return;
    const bounds = this.map.getBounds();
    this.bbox.set([
      Math.max(-180, bounds.getWest()),
      bounds.getSouth(),
      Math.min(180, bounds.getEast()),
      bounds.getNorth(),
    ]);
    this.zoom.set(this.map.getZoom());
  }

  private async applyStyle(id: BasemapId): Promise<void> {
    const style = await this.loadBasemapStyle(id);
    this.map?.setStyle(style);
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
