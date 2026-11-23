// TODO: UNVERIFIED CODE BELOW
import maplibregl from 'maplibre-gl';
import type { Overlay } from '../base/overlay';
import { FeatureSource } from './feature-source';

export abstract class OverlayRenderer<S extends Overlay = Overlay> {
  protected overlay: S | null = null;
  private shown: S | null = null;

  constructor(
    protected readonly map: maplibregl.Map,
    readonly id: string,
  ) {}

  abstract layerIds(): string[];

  isFor(overlay: Overlay): boolean {
    return this.overlay?.constructor === overlay.constructor;
  }

  setOverlay(overlay: S): void {
    this.overlay = overlay;
  }

  stage(): void {}

  show(): void {
    const overlay = this.overlay;
    if (!overlay) return;
    if (this.shown && this.isOnMap()) this.update(overlay, this.shown);
    else this.add(overlay);
    this.shown = overlay;
  }

  restore(): void {
    if (this.overlay && !this.isOnMap()) this.add(this.overlay);
    this.shown = this.overlay;
  }

  destroy(): void {
    for (const layerId of this.layerIds()) {
      if (this.map.getLayer(layerId)) this.map.removeLayer(layerId);
    }
    for (const sourceId of this.sourceIds()) {
      if (this.map.getSource(sourceId)) this.map.removeSource(sourceId);
    }
    this.overlay = null;
    this.shown = null;
  }

  protected sourceIds(): string[] {
    return [this.id];
  }

  protected isOnMap(): boolean {
    return this.layerIds().every((layerId) => this.map.getLayer(layerId) !== undefined);
  }

  protected abstract add(overlay: S): void;

  protected abstract update(overlay: S, previous: S): void;
}

export abstract class GeoJsonRenderer<S extends Overlay> extends OverlayRenderer<S> {
  constructor(
    map: maplibregl.Map,
    id: string,
    protected readonly source: FeatureSource,
  ) {
    super(map, id);
  }

  protected abstract featuresOf(overlay: S): GeoJSON.Feature[];

  protected abstract layersOf(overlay: S): maplibregl.LayerSpecification[];

  layerIds(): string[] {
    return this.overlay ? this.layersOf(this.overlay).map((layer) => layer.id) : [];
  }

  override stage(): void {
    if (this.overlay) this.source.setPart(this.id, this.featuresOf(this.overlay));
  }

  override destroy(): void {
    super.destroy();
    this.source.removePart(this.id);
  }

  protected override sourceIds(): string[] {
    return [];
  }

  protected partFilter(): maplibregl.FilterSpecification {
    return ['==', ['get', 'part'], this.id];
  }

  protected add(overlay: S): void {
    for (const layer of this.layersOf(overlay)) {
      if (!this.map.getLayer(layer.id)) this.map.addLayer(layer);
    }
  }

  protected update(overlay: S, previous: S): void {
    const layers = this.layersOf(overlay);
    const previousLayers = this.layersOf(previous);
    const sameLayers =
      layers.length === previousLayers.length &&
      layers.every((layer, index) => JSON.stringify(layer) === JSON.stringify(previousLayers[index]));
    if (sameLayers) return;
    for (const layer of previousLayers) {
      if (this.map.getLayer(layer.id)) this.map.removeLayer(layer.id);
    }
    for (const layer of layers) this.map.addLayer(layer);
  }
}

export function cssColor([r, g, b, alpha]: [number, number, number, number]): string {
  return `rgba(${r}, ${g}, ${b}, ${alpha / 255})`;
}
