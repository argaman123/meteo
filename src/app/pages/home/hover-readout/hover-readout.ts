import { Component, computed, inject, signal } from '@angular/core';
import { MapService } from '../../../engine/map-service';
import { LayersService } from '../../../layers/layers-service';

@Component({
  selector: 'app-hover-readout',
  templateUrl: './hover-readout.html',
  styleUrl: './hover-readout.css',
  host: { '(window:mousemove)': 'onMove($event)' },
})
export class HoverReadout {
  private map = inject(MapService);
  private layers = inject(LayersService);

  protected pointer = signal<{ x: number; y: number } | null>(null);
  protected text = computed(() => {
    const cursor = this.map.cursor();
    if (!cursor) return null;
    for (const [layer, grids] of this.layers.shownLayers()) {
      const loaded = grids();
      if (loaded) return layer.hover(loaded, cursor[0], cursor[1]);
    }
    return null;
  });

  protected onMove(event: MouseEvent): void {
    this.pointer.set({ x: event.clientX, y: event.clientY });
  }
}
