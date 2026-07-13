import { Component, computed, inject, signal } from '@angular/core';
import { MapService } from '../../../engine/map-service';
import { LayersService } from '../../../layers/layers-service';
import { layers } from '../../../layers/registry';

@Component({
  selector: 'app-hover-readout',
  templateUrl: './hover-readout.html',
  styleUrl: './hover-readout.css',
  host: { '(window:mousemove)': 'onMove($event)' },
})
export class HoverReadout {
  private map = inject(MapService);
  private layerService = inject(LayersService);

  protected pointer = signal<{ x: number; y: number } | null>(null);
  protected lines = computed(() => {
    const cursor = this.map.cursor();
    if (!cursor) return [];
    const result: { name: string; value: string }[] = [];
    for (const layer of Object.values(layers)) {
      const grids = this.layerService.activeLayers().get(layer)?.();
      if (grids) {
        result.push({ name: layer.name, value: layer.hover(grids, cursor[0], cursor[1]) });
      }
    }
    return result;
  });

  protected onMove(event: MouseEvent): void {
    this.pointer.set({ x: event.clientX, y: event.clientY });
  }
}
