import { Service, inject } from '@angular/core';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { BitmapLayer } from '@deck.gl/layers';
import { ViewStore } from '../stores/view-store';
import { Bounds } from '../types/wrap';
import { BasemapId, loadBasemapStyle } from './style-loader';

export type { BasemapId } from './style-loader';

@Service()
export class MapEngine {
  private view = inject(ViewStore);
  private map: maplibregl.Map | null = null;
  private overlay: MapboxOverlay | null = null;

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
    this.publishView();
    this.view.settledBbox.set(this.view.bbox());
  }

  async setBasemap(id: BasemapId): Promise<void> {
    const style = await loadBasemapStyle(id);
    this.map?.setStyle(style);
  }

  showColormap(id: string, image: ImageData, bounds: Bounds, opacity: number): void {
    if (!this.map) return;
    if (!this.overlay) {
      this.overlay = new MapboxOverlay({ interleaved: true, layers: [] });
      this.map.addControl(this.overlay as unknown as maplibregl.IControl);
    }
    this.overlay.setProps({ layers: [new BitmapLayer({ id, image, bounds, opacity })] });
  }

  destroy(): void {
    this.overlay = null;
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
}
