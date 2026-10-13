import { Service, inject, signal } from '@angular/core';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { Subject } from 'rxjs';
import { Bounds } from '../types/wrap';
import {
  Projection,
  Quality,
  projection,
  quality,
} from '../pages/home/settings-panel/settings-controls';
import { OverlayService } from './overlay-service';

export type BasemapId = 'dark' | 'light' | 'colorful';

export const basemapBright = signal(false);

export function inkColor(): string {
  return basemapBright() ? '#212429' : '#ffffff';
}

export const OUTLINE_COLOR = '#0f172a';

export const MAP_FONT = "'Source Sans 3', 'Heebo', sans-serif";

maplibregl.addProtocol('pmtiles', new Protocol().tile);
void maplibregl.setRTLTextPlugin('/basemaps/rtl/mapbox-gl-rtl-text.js', true);

export interface MarkerDrag {
  element: HTMLElement;
  point: [number, number];
}

export interface MapClick {
  lon: number;
  lat: number;
  clientX: number;
  clientY: number;
}

@Service()
export class MapService {
  private overlayService = inject(OverlayService);
  private map: maplibregl.Map | null = null;
  private fixedBounds: Bounds | null = null;
  private markers = new Map<HTMLElement, maplibregl.Marker>();

  readonly bbox = signal<Bounds | null>(null);
  readonly settledBbox = signal<Bounds | null>(null);
  readonly zoom = signal<number | null>(null);
  readonly settledZoom = signal<number | null>(null);
  readonly cursor = signal<[number, number] | null>(null);
  readonly clicks = new Subject<MapClick>();
  readonly rightClicks = new Subject<MapClick>();
  readonly markerDrags = new Subject<MarkerDrag>();
  readonly basemap = signal<BasemapId>('dark');
  readonly basemaps: { id: BasemapId; label: string; bright: boolean }[] = [
    { id: 'dark', label: 'כהה', bright: false },
    { id: 'light', label: 'בהיר', bright: true },
    { id: 'colorful', label: 'צבעוני', bright: true },
  ];

  async init(container: HTMLElement, fixedBounds: Bounds | null = null): Promise<void> {
    await document.fonts.ready;
    this.fixedBounds = fixedBounds;
    const style = await this.loadBasemapStyle(this.basemap());
    this.map = new maplibregl.Map({
      container,
      style,
      bounds: fixedBounds ?? [
        [34.2, 28.7],
        [35.9, 34.1],
      ],
      interactive: fixedBounds === null,
      minZoom: Math.max(0, Math.log2(container.clientWidth / 512)),
      attributionControl: false,
      canvasContextAttributes: {
        antialias: quality() !== Quality.Low,
        preserveDrawingBuffer: true,
      },
      fadeDuration: quality() === Quality.Low ? 0 : 300,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    this.map.keyboard.disable();
    this.map.touchZoomRotate.disableRotation();
    this.map.on('move', () => this.publish());
    this.map.on('resize', () => this.fitFixedView());
    this.map.on('moveend', () => {
      this.settledBbox.set(this.bbox());
      this.settledZoom.set(this.zoom());
    });
    this.map.on('mousemove', (event) => {
      this.cursor.set([event.lngLat.lng, event.lngLat.lat]);
    });
    this.map.on('click', (event) => this.clicks.next(this.mapClickOf(event)));
    this.map.on('contextmenu', (event) => this.rightClicks.next(this.mapClickOf(event)));
    this.map.getCanvasContainer().addEventListener('mouseleave', () => this.cursor.set(null));
    this.fitFixedView();
    this.overlayService.attach(this.map);
    this.publish();
    this.settledBbox.set(this.bbox());
    this.settledZoom.set(this.zoom());
  }

  destroy(): void {
    for (const element of [...this.markers.keys()]) this.hideMarker(element);
    this.overlayService.detach();
    this.map?.remove();
    this.map = null;
    this.bbox.set(null);
    this.settledBbox.set(null);
    this.zoom.set(null);
    this.settledZoom.set(null);
    this.cursor.set(null);
  }

  setBasemap(id: BasemapId): void {
    this.basemap.set(id);
    basemapBright.set(this.basemaps.find((item) => item.id === id)!.bright);
    void this.applyStyle(id);
  }

  setProjection(value: Projection): void {
    projection.set(value);
    this.map?.setProjection(this.projectionSpecification());
  }

  fixView(bounds: Bounds): void {
    this.fixedBounds = bounds;
    this.fitFixedView();
  }

  private fitFixedView(): void {
    if (!this.fixedBounds) return;
    this.map?.fitBounds(this.fixedBounds, { animate: false, padding: 30 });
  }

  flyTo(center: [number, number], zoom?: number): void {
    this.map?.flyTo({ center, zoom });
  }

  showMarker(element: HTMLElement, point: [number, number], draggable = false): void {
    if (!this.map) return;
    const shown = this.markers.get(element);
    if (shown) shown.setLngLat(point);
    else this.createMarker(element, draggable).setLngLat(point).addTo(this.map);
  }

  hideMarker(element: HTMLElement): void {
    this.markers.get(element)?.remove();
    this.markers.delete(element);
  }

  setDoubleClickZoom(enabled: boolean): void {
    if (enabled) this.map?.doubleClickZoom.enable();
    else this.map?.doubleClickZoom.disable();
  }

  private createMarker(element: HTMLElement, draggable: boolean): maplibregl.Marker {
    const marker = new maplibregl.Marker({ element, draggable });
    element.addEventListener('click', (event) => event.stopPropagation());
    marker.on('drag', () => {
      const { lng, lat } = marker.getLngLat();
      this.markerDrags.next({ element, point: [lng, lat] });
    });
    this.markers.set(element, marker);
    return marker;
  }

  private mapClickOf(event: maplibregl.MapMouseEvent): MapClick {
    return {
      lon: event.lngLat.lng,
      lat: event.lngLat.lat,
      clientX: event.originalEvent.clientX,
      clientY: event.originalEvent.clientY,
    };
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

  private projectionSpecification(): maplibregl.ProjectionSpecification {
    const globe = projection() === Projection.Globe && this.fixedBounds === null;
    return { type: globe ? 'globe' : 'mercator' };
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
    style.projection = this.projectionSpecification();
    for (const source of Object.values(style.sources)) {
      if ('url' in source && source.url?.startsWith('pmtiles:///')) {
        source.url = `pmtiles://${location.origin}/${source.url.slice('pmtiles:///'.length)}`;
      }
      if (
        source.type === 'geojson' &&
        typeof source.data === 'string' &&
        source.data.startsWith('/')
      ) {
        source.data = location.origin + source.data;
      }
    }
    return style;
  }
}
