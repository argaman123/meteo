import { Service, inject, signal } from '@angular/core';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { Subject } from 'rxjs';
import { Bounds } from '../types/wrap';
import { Overlay } from './overlay';

export type BasemapId = 'dark' | 'light' | 'colorful';

export const basemapBright = signal(false);

export interface MapClick {
  lon: number;
  lat: number;
  clientX: number;
  clientY: number;
}

@Service()
export class MapService {
  private overlay = inject(Overlay);
  private map: maplibregl.Map | null = null;
  private markers = new Map<HTMLElement, maplibregl.Marker>();
  private rightClickSubject = new Subject<MapClick>();

  readonly bbox = signal<Bounds | null>(null);
  readonly settledBbox = signal<Bounds | null>(null);
  readonly zoom = signal<number | null>(null);
  readonly settledZoom = signal<number | null>(null);
  readonly cursor = signal<[number, number] | null>(null);
  readonly rightClicks = this.rightClickSubject.asObservable();
  readonly basemap = signal<BasemapId>('dark');
  readonly basemaps: { id: BasemapId; label: string; bright: boolean }[] = [
    { id: 'dark', label: 'כהה', bright: false },
    { id: 'light', label: 'בהיר', bright: true },
    { id: 'colorful', label: 'צבעוני', bright: true },
  ];

  async init(container: HTMLElement): Promise<void> {
    await document.fonts.ready;
    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);
    void maplibregl.setRTLTextPlugin('/basemaps/rtl/mapbox-gl-rtl-text.js', true);
    const style = await this.loadBasemapStyle(this.basemap());
    this.map = new maplibregl.Map({
      container,
      style,
      bounds: [
        [34.2, 28.7],
        [35.9, 34.1],
      ],
      minZoom: Math.max(0, Math.log2(container.clientWidth / 512)),
      attributionControl: false,
      canvasContextAttributes: { antialias: true },
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    this.map.keyboard.disable();
    this.map.touchZoomRotate.disableRotation();
    this.map.on('move', () => this.publish());
    this.map.on('moveend', () => {
      this.settledBbox.set(this.bbox());
      this.settledZoom.set(this.zoom());
    });
    this.map.on('mousemove', (event) => {
      this.cursor.set([event.lngLat.lng, event.lngLat.lat]);
    });
    this.map.on('contextmenu', (event) => {
      this.rightClickSubject.next({
        lon: event.lngLat.lng,
        lat: event.lngLat.lat,
        clientX: event.originalEvent.clientX,
        clientY: event.originalEvent.clientY,
      });
    });
    this.map.getCanvasContainer().addEventListener('mouseleave', () => this.cursor.set(null));
    this.overlay.attach(this.map);
    this.publish();
    this.settledBbox.set(this.bbox());
    this.settledZoom.set(this.zoom());
  }

  destroy(): void {
    for (const element of [...this.markers.keys()]) this.hideMarker(element);
    this.overlay.detach();
    this.map?.remove();
    this.map = null;
    this.bbox.set(null);
    this.settledBbox.set(null);
    this.zoom.set(null);
    this.settledZoom.set(null);
    this.cursor.set(null);
    maplibregl.removeProtocol('pmtiles');
  }

  setBasemap(id: BasemapId): void {
    this.basemap.set(id);
    basemapBright.set(this.basemaps.find((item) => item.id === id)!.bright);
    void this.applyStyle(id);
  }

  flyTo(center: [number, number], zoom?: number): void {
    this.map?.flyTo({ center, zoom });
  }

  showMarker(element: HTMLElement, point: [number, number]): void {
    if (!this.map) return;
    const marker = this.markers.get(element) ?? new maplibregl.Marker({ element });
    this.markers.set(element, marker);
    marker.setLngLat(point).addTo(this.map);
  }

  hideMarker(element: HTMLElement): void {
    this.markers.get(element)?.remove();
    this.markers.delete(element);
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
      if (source.type === 'geojson' && typeof source.data === 'string' && source.data.startsWith('/')) {
        source.data = location.origin + source.data;
      }
    }
    return style;
  }
}
