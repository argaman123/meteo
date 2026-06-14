import { Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { HttpResourceRef, httpResource } from '@angular/common/http';
import { MapEngine } from '../engine/map-engine';
import { LayerCatalogEntry, LayerDefinition, layerParameters } from '../layers/layer-definition';
import { layerRegistry } from '../layers/registry';
import { LayersStore } from '../stores/layers-store';
import { TimeStore } from '../stores/time-store';
import { Bounds, FieldGrid, FieldGridDocument, VectorField } from '../types/field-grid';
import { knotsToMetersPerSecond } from '../units/units';
import { containsBounds, coveredFraction, expandBounds } from '../utils/bbox';
import { mapGridValues, parseFieldGrid, toVectorField } from '../utils/grids';

const LOCAL_MODEL_COVERAGE: Bounds = [0, 24, 50, 52];
const LOCAL_MODEL_MINIMUM_VISIBLE_COVERAGE = 0.8;
const BBOX_PADDING_FACTOR = 0;
const REFETCH_SHRINK_RATIO = 0.5;

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
  private lastCompleteGrids = new Map<string, Record<string, FieldGrid>>();

  private model = computed(() => {
    const view = this.engine.settledBounds();
    if (!view) return 'wide';
    const covered = coveredFraction(view, LOCAL_MODEL_COVERAGE);
    return covered >= LOCAL_MODEL_MINIMUM_VISIBLE_COVERAGE ? 'local' : 'wide';
  });

  readonly loadedLayers = computed<LoadedLayer[]>(() => {
    const loaded: LoadedLayer[] = [];
    for (const entry of layerRegistry) {
      const state = this.layersStore.stateOf(entry.id);
      if (!state?.active) {
        this.lastCompleteGrids.delete(entry.id);
        continue;
      }
      const grids: Record<string, FieldGrid> = {};
      let complete = true;
      let failed = false;
      for (const parameter of layerParameters(entry)) {
        const resource = this.resources.get(resourceKey(entry.id, parameter));
        if (resource?.status() === 'error') {
          failed = true;
          break;
        }
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
      if (failed) {
        this.lastCompleteGrids.delete(entry.id);
        continue;
      }
      if (complete) {
        this.lastCompleteGrids.set(entry.id, grids);
        loaded.push({ entry, opacity: state.opacity, order: state.order, grids });
        continue;
      }
      const stale = this.lastCompleteGrids.get(entry.id);
      if (stale) {
        loaded.push({ entry, opacity: state.opacity, order: state.order, grids: stale });
      }
    }
    return loaded;
  });

  constructor() {
    effect(() => {
      const settled = this.engine.settledBounds();
      if (!settled) return;
      const current = untracked(this.requestBounds);
      const zoomedInPastDetail =
        current !== null && settled[2] - settled[0] < (current[2] - current[0]) * REFETCH_SHRINK_RATIO;
      if (!current || !containsBounds(current, settled) || zoomedInPastDetail) {
        this.requestBounds.set(expandBounds(settled, BBOX_PADDING_FACTOR));
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
