import { Service, effect, inject, signal } from '@angular/core';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Layer } from '@deck.gl/core';
import { LayerDefinition, ParticleLayerDefinition } from '../layers/layer-definition';
import { ParticleSettings } from '../settings/particle-settings';
import { QualitySettings } from '../settings/quality-settings';
import { Bounds } from '../types/field-grid';
import { renderColormapLayer } from './renderers/colormap-renderer';
import {
  ParticleSystem,
  particleLineWidth,
  renderCellGrid,
  renderParticleLayer,
  renderStartMarkers,
} from './renderers/particle-renderer';
import { BasemapId, loadBasemapStyle } from './style-loader';

export type { BasemapId } from './style-loader';

@Service()
export class MapEngine {
  private quality = inject(QualitySettings);
  private particleSettings = inject(ParticleSettings);
  private map: maplibregl.Map | null = null;
  private overlay: MapboxOverlay | null = null;
  private definitions = new Map<string, LayerDefinition>();
  private particleSystems = new Map<string, ParticleSystem>();
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
    this.particleSystems.clear();
    this.overlay = null;
    this.definitions.clear();
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
    const debug = this.particleSettings.showGrid();
    const layers: Layer[] = [...this.definitions.values()]
      .sort((a, b) => a.order - b.order)
      .map((definition) => this.toDeckLayer(definition, debug));
    if (debug) {
      for (const definition of this.definitions.values()) {
        if (!('wind' in definition)) continue;
        const system = this.particleSystems.get(definition.entry.id);
        if (!system) continue;
        layers.push(renderCellGrid(`${definition.entry.id}-grid`, system));
        layers.push(renderStartMarkers(`${definition.entry.id}-starts`, system));
      }
    }
    this.overlay.setProps({ layers });
  }

  private toDeckLayer(definition: LayerDefinition, debug: boolean): Layer {
    if ('grid' in definition) {
      return renderColormapLayer(definition, this.quality.textureMaxDimension());
    }
    const widthPixels = particleLineWidth() * this.particleSettings.widthScale();
    return renderParticleLayer(definition, this.particleSystem(definition), widthPixels, debug);
  }

  private particleSystem(definition: ParticleLayerDefinition): ParticleSystem {
    const id = definition.entry.id;
    const existing = this.particleSystems.get(id);
    const [cols, rows] = this.gridDimensions(definition.wind.bounds);
    if (existing && existing.wind === definition.wind && existing.gridCols === cols && existing.gridRows === rows) {
      return existing;
    }
    const system = new ParticleSystem(definition.wind, cols, rows);
    this.particleSystems.set(id, system);
    return system;
  }

  private gridDimensions(bounds: Bounds): [number, number] {
    const cellPx = this.particleSettings.cellSizePx();
    if (!this.map) return [Math.round((bounds[2] - bounds[0]) / 3), Math.round((bounds[3] - bounds[1]) / 3)];
    const west = this.map.project([bounds[0], (bounds[1] + bounds[3]) / 2]).x;
    const east = this.map.project([bounds[2], (bounds[1] + bounds[3]) / 2]).x;
    const north = this.map.project([(bounds[0] + bounds[2]) / 2, bounds[3]]).y;
    const south = this.map.project([(bounds[0] + bounds[2]) / 2, bounds[1]]).y;
    const cols = Math.max(1, Math.round(Math.abs(east - west) / cellPx));
    const rows = Math.max(1, Math.round(Math.abs(south - north) / cellPx));
    return [cols, rows];
  }

  private animate = (nowMs: number): void => {
    const deltaSeconds = Math.min(0.1, (nowMs - this.lastTickMs) / 1000 || 0.016);
    this.lastTickMs = nowMs;
    const tuning = this.particleSettings.tuning();
    for (const [id, system] of this.particleSystems) {
      if (!this.definitions.has(id)) {
        this.particleSystems.delete(id);
        continue;
      }
      system.step(deltaSeconds, tuning);
    }
    this.syncLayers();
    this.animationFrame = requestAnimationFrame(this.animate);
  };

  private updateAnimationLoop(): void {
    const hasParticles = [...this.definitions.values()].some((definition) => 'wind' in definition);
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
