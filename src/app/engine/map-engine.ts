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
  renderParticleLayer,
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
    this.overlay.setProps({
      layers: [...this.definitions.values()]
        .sort((a, b) => a.order - b.order)
        .map((definition) => this.toDeckLayer(definition)),
    });
  }

  private toDeckLayer(definition: LayerDefinition): Layer {
    if ('grid' in definition) {
      return renderColormapLayer(definition, this.quality.textureMaxDimension());
    }
    const widthPixels = particleLineWidth() * this.particleSettings.widthScale();
    return renderParticleLayer(definition, this.particleSystem(definition), widthPixels);
  }

  private particleSystem(definition: ParticleLayerDefinition): ParticleSystem {
    const id = definition.entry.id;
    const existing = this.particleSystems.get(id);
    const cellSizeDegrees = this.cellSizeDegrees(definition.wind.bounds);
    if (
      existing &&
      existing.wind === definition.wind &&
      existing.cellSizeDegrees === cellSizeDegrees
    ) {
      return existing;
    }
    const system = new ParticleSystem(definition.wind, cellSizeDegrees);
    this.particleSystems.set(id, system);
    return system;
  }

  private cellSizeDegrees(bounds: Bounds): number {
    const canvasWidthPx = this.map?.getCanvas().clientWidth ?? 1280;
    const boundsWidthDegrees = bounds[2] - bounds[0];
    return (this.particleSettings.cellSizePx() * boundsWidthDegrees) / canvasWidthPx;
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
