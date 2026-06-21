import { Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { HttpResourceRef, httpResource } from '@angular/common/http';
import { MapEngine } from '../engine/map-engine';
import { Layer, RenderItem } from '../layers/layer';
import { layerRegistry } from '../layers/registry';
import { LayersStore } from '../stores/layers-store';
import { TimeStore } from '../stores/time-store';
import { Bounds, Wrap } from '../types/wrap';
import { containsBounds, coveredFraction, expandBounds } from '../utils/bbox';
import { Grid } from '../objects/grid';

const LOCAL_MODEL_COVERAGE: Bounds = [0, 24, 50, 52];
const LOCAL_MODEL_MINIMUM_VISIBLE_COVERAGE = 0.8;
const BBOX_PADDING_FACTOR = 0;
const REFETCH_SHRINK_RATIO = 0.5;

export interface ActiveLayer {
  layer: Layer;
  grids: Grid[];
  order: number;
}

@Service()
export class FieldData {
  private engine = inject(MapEngine);
  private layersStore = inject(LayersStore);
  private timeStore = inject(TimeStore);
  private requestBounds = signal<Bounds | null>(null);
  private resources = new Map<string, HttpResourceRef<Grid | undefined>>();
  private lastCompleteGrids = new Map<string, Grid[]>();

  private model = computed(() => {
    const view = this.engine.settledBounds();
    if (!view) return 'wide';
    const covered = coveredFraction(view, LOCAL_MODEL_COVERAGE);
    return covered >= LOCAL_MODEL_MINIMUM_VISIBLE_COVERAGE ? 'local' : 'wide';
  });

  readonly activeLayers = computed<ActiveLayer[]>(() => {
    const active: ActiveLayer[] = [];
    for (const layer of layerRegistry) {
      const state = this.layersStore.stateOf(layer.id);
      if (!state?.active) {
        this.lastCompleteGrids.delete(layer.id);
        continue;
      }
      const resolved = this.resolveGrids(layer);
      if (resolved.status === 'failed') {
        this.lastCompleteGrids.delete(layer.id);
        continue;
      }
      if (resolved.status === 'complete') {
        this.lastCompleteGrids.set(layer.id, resolved.grids);
        active.push({ layer, grids: resolved.grids, order: state.order });
        continue;
      }
      const stale = this.lastCompleteGrids.get(layer.id);
      if (stale) {
        active.push({ layer, grids: stale, order: state.order });
      }
    }
    return active;
  });

  private resolveGrids(layer: Layer): { status: 'complete' | 'incomplete' | 'failed'; grids: Grid[] } {
    const grids: Grid[] = [];
    for (const parameter of layer.parameters) {
      const resource = this.resources.get(resourceKey(layer.id, parameter));
      if (resource?.status() === 'error') return { status: 'failed', grids };
      if (!resource?.hasValue()) return { status: 'incomplete', grids };
      const grid = resource.value();
      if (!grid) return { status: 'incomplete', grids };
      grids.push(grid);
    }
    return { status: 'complete', grids };
  }

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
    for (const layer of layerRegistry) {
      for (const parameter of layer.parameters) {
        this.resources.set(
          resourceKey(layer.id, parameter),
          httpResource<Grid>(
            () => {
              if (!this.layersStore.stateOf(layer.id)?.active) return undefined;
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
            },
            { parse: (raw) => Grid.fromWrap(raw as Wrap) },
          ),
        );
      }
    }
    effect(() => this.syncEngine());
  }

  private syncEngine(): void {
    const items = this.activeLayers().flatMap((active) =>
      buildRenderItems(active.layer, active.grids, active.order),
    );
    this.engine.setItems(items);
  }
}

function resourceKey(layerId: string, parameter: string): string {
  return `${layerId}:${parameter}`;
}

function buildRenderItems(layer: Layer, grids: Grid[], order: number): RenderItem[] {
  const template = grids[0];
  const cells = template.width * template.height;
  return layer.looks.map((look, index) => {
    const id = `${layer.id}:${index}`;
    if (look.kind === 'colormap') {
      const out = new Float32Array(cells);
      for (let i = 0; i < cells; i++) out[i] = look.scalar(valuesAtCell(grids, i));
      return {
        id,
        look,
        grids: [Grid.fromValues(template, out)],
        interpolation: layer.interpolation,
        opacity: look.defaultOpacity,
        order,
      };
    }
    const u = new Float32Array(cells);
    const v = new Float32Array(cells);
    for (let i = 0; i < cells; i++) {
      const moved = look.vector(valuesAtCell(grids, i));
      u[i] = moved.u;
      v[i] = moved.v;
    }
    return {
      id,
      look,
      grids: [Grid.fromValues(template, u), Grid.fromValues(template, v)],
      interpolation: layer.interpolation,
      opacity: look.defaultOpacity,
      order,
    };
  });
}

function valuesAtCell(grids: Grid[], index: number): number[] {
  return grids.map((grid) => grid.data[index]);
}
