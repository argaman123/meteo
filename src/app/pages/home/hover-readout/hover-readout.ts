import { Component, computed, inject, signal } from '@angular/core';
import { MapService } from '../../../engine/map-service';
import { LayersService } from '../../../layers/layers-service';

@Component({
  selector: 'app-hover-readout',
  templateUrl: './hover-readout.html',
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
    for (const [layer, dataSignal] of this.layerService.activeLayers()) {
      const data = dataSignal();
      if (data !== undefined && data !== null) {
        result.push({ name: layer.name, value: layer.hover(data, cursor[0], cursor[1]) });
      }
    }
    return result;
  });

  protected onMove(event: MouseEvent): void {
    this.pointer.set({ x: event.clientX, y: event.clientY });
  }
}
