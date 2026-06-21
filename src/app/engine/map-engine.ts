import { Service, effect, inject, signal } from '@angular/core';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Layer } from '@deck.gl/core';
import { RenderItem } from '../layers/layer';
import { ParticleLook } from '../layers/look';
import { ParticleSettings } from '../settings/particle-settings';
import { QualitySettings } from '../settings/quality-settings';
import { Bounds } from '../types/wrap';
import { renderColormapLayer } from './renderers/colormap-renderer';
import { FreeParticles } from './renderers/free-particles';
import { GridParticles } from './renderers/grid-particles';
import { renderParticleLayer } from './renderers/particle-renderer';
import { MAX_PARTICLES, ParticleSystem } from './renderers/particle-system';
import { BasemapId, loadBasemapStyle } from './style-loader';

export type { BasemapId } from './style-loader';

@Service()
export class MapEngine {
  private quality = inject(QualitySettings);
  private particleSettings = inject(ParticleSettings);
  private map: maplibregl.Map | null = null;
  private overlay: MapboxOverlay | null = null;
  private items = new Map<string, RenderItem>();
  private particleSystems = new Map<string, ParticleSystem>();
  private particleGridCellPx = new Map<string, number>();
  private particleViewKey = new Map<string, string>();
  private animationFrame: number | null = null;
  private lastTickMs = 0;

  readonly viewBounds = signal<Bounds | null>(null);
  readonly settledBounds = signal<Bounds | null>(null);
  readonly zoom = signal<number | null>(null);
  readonly cursor = signal<{ point: [number, number]; lngLat: [number, number] } | null>(null);

  constructor() {
    effect(() => {
      this.particleSettings.cellSizePx();
      this.quality.textureMaxDimension();
      this.settledBounds();
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
      minZoom: Math.max(0, Math.log2(container.clientWidth / 512)),
      attributionControl: false,
    });
    this.map.keyboard.disable();
    this.map.on('style.load', () => this.syncLayers());
    this.map.on('move', () => this.publishView());
    this.map.on('moveend', () => this.settledBounds.set(this.viewBounds()));
    this.map.on('mousemove', (event) => {
      this.cursor.set({
        point: [event.point.x, event.point.y],
        lngLat: [event.lngLat.lng, event.lngLat.lat],
      });
    });
    this.map.getCanvasContainer().addEventListener('mouseleave', () => this.cursor.set(null));
    this.publishView();
    this.settledBounds.set(this.viewBounds());
  }

  async setBasemap(id: BasemapId): Promise<void> {
    const style = await loadBasemapStyle(id);
    this.map?.setStyle(style);
  }

  setItems(items: RenderItem[]): void {
    this.items = new Map(items.map((item) => [item.id, item]));
    for (const id of [...this.particleSystems.keys()]) {
      if (!this.items.has(id)) {
        this.particleSystems.delete(id);
        this.particleGridCellPx.delete(id);
        this.particleViewKey.delete(id);
      }
    }
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
    this.particleSystems.clear();
    this.particleGridCellPx.clear();
    this.particleViewKey.clear();
    this.overlay = null;
    this.items.clear();
    this.map?.remove();
    this.map = null;
    this.viewBounds.set(null);
    this.settledBounds.set(null);
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
    const layers: Layer[] = [...this.items.values()]
      .sort((a, b) => a.order - b.order)
      .map((item) => this.toDeckLayer(item));
    this.overlay.setProps({ layers });
  }

  private toDeckLayer(item: RenderItem): Layer {
    const look = item.look;
    if (look.kind === 'colormap') {
      return renderColormapLayer(
        {
          id: item.id,
          grid: item.grids[0],
          palette: look.palette,
          paletteStyle: look.paletteStyle,
          interpolation: item.interpolation,
          visibleRange: look.visibleRange,
          opacity: item.opacity,
        },
        this.quality.textureMaxDimension(),
      );
    }
    const sizeScale = this.zoomScale();
    const widthPixels = look.lineWidthPixels * this.particleSettings.widthScale() * sizeScale;
    return renderParticleLayer(
      item.id,
      look.appearance,
      item.opacity,
      this.particleSystem(item, look),
      widthPixels,
      sizeScale,
    );
  }

  private zoomScale(): number {
    const zoom = this.zoom() ?? 5;
    return Math.max(0.7, Math.min(2.2, 1 + (zoom - 5) * 0.18));
  }

  private particleSystem(item: RenderItem, look: ParticleLook): ParticleSystem {
    const id = item.id;
    const u = item.grids[0];
    const v = item.grids[1];
    const existing = this.particleSystems.get(id);
    const cellPx = this.particleSettings.cellSizePx();
    const viewKey = (this.settledBounds() ?? []).join(',');
    if (
      existing &&
      existing.uField === u &&
      existing.vField === v &&
      this.particleGridCellPx.get(id) === cellPx &&
      this.particleViewKey.get(id) === viewKey
    ) {
      return existing;
    }
    const bounds = u.bounds;
    const [cols, rows] = this.gridDimensions(bounds);
    const motion = look.motion;
    let system: ParticleSystem;
    if (motion.strategy === 'grid') {
      system = new GridParticles(u, v, cols, rows, motion);
    } else {
      const count = Math.min(MAX_PARTICLES, Math.round(cols * rows * motion.densityFactor));
      const cellDegrees = (bounds[2] - bounds[0]) / cols;
      system = new FreeParticles(u, v, count, cellDegrees, motion);
    }
    this.particleSystems.set(id, system);
    this.particleGridCellPx.set(id, cellPx);
    this.particleViewKey.set(id, viewKey);
    return system;
  }

  private gridDimensions(bounds: Bounds): [number, number] {
    const cellPx = this.particleSettings.cellSizePx();
    if (!this.map) {
      return [
        Math.max(1, Math.round((bounds[2] - bounds[0]) / 3)),
        Math.max(1, Math.round((bounds[3] - bounds[1]) / 3)),
      ];
    }
    const west = this.map.project([bounds[0], (bounds[1] + bounds[3]) / 2]).x;
    const east = this.map.project([bounds[2], (bounds[1] + bounds[3]) / 2]).x;
    const north = this.map.project([(bounds[0] + bounds[2]) / 2, bounds[3]]).y;
    const south = this.map.project([(bounds[0] + bounds[2]) / 2, bounds[1]]).y;
    return [
      Math.max(1, Math.round(Math.abs(east - west) / cellPx)),
      Math.max(1, Math.round(Math.abs(south - north) / cellPx)),
    ];
  }

  private animate = (nowMs: number): void => {
    const deltaSeconds = Math.min(0.1, (nowMs - this.lastTickMs) / 1000 || 0.016);
    this.lastTickMs = nowMs;
    const speedFactor = this.particleSettings.speedFactor();
    for (const [id, system] of this.particleSystems) {
      if (!this.items.has(id)) {
        this.particleSystems.delete(id);
        this.particleGridCellPx.delete(id);
        this.particleViewKey.delete(id);
        continue;
      }
      system.step(deltaSeconds, speedFactor);
    }
    this.syncLayers();
    this.animationFrame = requestAnimationFrame(this.animate);
  };

  private updateAnimationLoop(): void {
    const hasParticles = [...this.items.values()].some((item) => item.look.kind === 'particles');
    if (hasParticles && this.animationFrame === null) {
      this.lastTickMs = performance.now();
      this.animationFrame = requestAnimationFrame(this.animate);
    }
    if (!hasParticles && this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
}
