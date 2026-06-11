import { Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { HttpResourceRef, httpResource } from '@angular/common/http';
import { MapEngine } from '../engine/map-engine';
import { LayerCatalogEntry, LayerDefinition, layerParameters } from '../layers/layer-definition';
import { layerRegistry } from '../layers/registry';
import { LayersStore } from '../stores/layers-store';
import { TimeStore } from '../stores/time-store';
import { Bounds, FieldGrid, FieldGridDocument, VectorField } from '../types/field-grid';
import { knotsToMetersPerSecond } from '../units/units';
import { containsBounds, expandBounds } from '../utils/bbox';
import { mapGridValues, parseFieldGrid, toVectorField } from '../utils/grids';

const MODEL_ZOOM_THRESHOLD = 5;
const BBOX_PADDING_FACTOR = 0.25;

export interface LoadedLayer {
  entry: LayerCatalogEntry;
  opacity: number;
  order: number;
  grids: Record<string, FieldGrid>;
}

const parsedGrids = new WeakMap<FieldGridDocument, FieldGrid>();
const windFields = new WeakMap<FieldGrid, VectorField>();

@Service()
export class FieldData {
  private engine = inject(MapEngine);
  private layersStore = inject(LayersStore);
  private timeStore = inject(TimeStore);
  private requestBounds = signal<Bounds | null>(null);
  private resources = new Map<string, HttpResourceRef<FieldGridDocument | undefined>>();

  private model = computed(() =>
    (this.engine.zoom() ?? 0) >= MODEL_ZOOM_THRESHOLD ? 'local' : 'wide',
  );

  readonly loadedLayers = computed<LoadedLayer[]>(() => {
    const loaded: LoadedLayer[] = [];
    for (const entry of layerRegistry) {
      const state = this.layersStore.stateOf(entry.id);
      if (!state?.active) continue;
      const grids: Record<string, FieldGrid> = {};
      let complete = true;
      for (const parameter of layerParameters(entry)) {
        const resource = this.resources.get(resourceKey(entry.id, parameter));
        if (!resource?.hasValue()) {
          complete = false;
          break;
        }
        const document = resource.value();
        if (!document) {
          complete = false;
          break;
        }
        grids[parameter] = parseDocument(document);
      }
      if (complete) {
        loaded.push({ entry, opacity: state.opacity, order: state.order, grids });
      }
    }
    return loaded;
  });

  constructor() {
    effect(() => {
      const visible = this.engine.viewBounds();
      if (!visible) return;
      const current = untracked(this.requestBounds);
      if (!current || !containsBounds(current, visible)) {
        this.requestBounds.set(expandBounds(visible, BBOX_PADDING_FACTOR));
      }
    });
    for (const entry of layerRegistry) {
      for (const parameter of layerParameters(entry)) {
        this.resources.set(
          resourceKey(entry.id, parameter),
          httpResource<FieldGridDocument>(() => {
            if (!this.layersStore.stateOf(entry.id)?.active) return undefined;
            const bounds = this.requestBounds();
            if (!bounds) return undefined;
            return {
              url: '/api/grids',
              params: {
                parameter,
                model: this.model(),
                time: String(this.timeStore.currentTime()),
                bbox: bounds.join(','),
              },
            };
          }),
        );
      }
    }
    effect(() => this.syncEngine());
  }

  private syncEngine(): void {
    const loaded = this.loadedLayers();
    for (const entry of layerRegistry) {
      const layer = loaded.find((candidate) => candidate.entry.id === entry.id);
      if (layer) {
        this.engine.addLayer(toDefinition(layer));
      } else {
        this.engine.removeLayer(entry.id);
      }
    }
  }
}

function resourceKey(layerId: string, parameter: string): string {
  return `${layerId}:${parameter}`;
}

function parseDocument(document: FieldGridDocument): FieldGrid {
  let grid = parsedGrids.get(document);
  if (!grid) {
    grid = parseFieldGrid(document);
    parsedGrids.set(document, grid);
  }
  return grid;
}

function toDefinition(layer: LoadedLayer): LayerDefinition {
  if (layer.entry.type === 'colormap') {
    return {
      entry: layer.entry,
      grid: layer.grids[layer.entry.parameter],
      opacity: layer.opacity,
      order: layer.order,
    };
  }
  const speed = layer.grids[layer.entry.speedParameter];
  const direction = layer.grids[layer.entry.directionParameter];
  let wind = windFields.get(speed);
  if (!wind) {
    const speedMetersPerSecond =
      speed.units === 'kt' ? mapGridValues(speed, knotsToMetersPerSecond, 'm/s') : speed;
    wind = toVectorField(speedMetersPerSecond, direction);
    windFields.set(speed, wind);
  }
  return { entry: layer.entry, wind, opacity: layer.opacity, order: layer.order };
}
