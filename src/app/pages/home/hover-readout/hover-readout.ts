import { Component, computed, inject } from '@angular/core';
import { FieldData } from '../../../data/field-data';
import { MapEngine } from '../../../engine/map-engine';
import { LayersStore } from '../../../stores/layers-store';

@Component({
  selector: 'app-hover-readout',
  templateUrl: './hover-readout.html',
  styleUrl: './hover-readout.css',
})
export class HoverReadout {
  private engine = inject(MapEngine);
  private fieldData = inject(FieldData);
  private layersStore = inject(LayersStore);

  readout = computed(() => {
    if (!this.layersStore.hoverReadoutEnabled()) return null;
    const cursor = this.engine.cursor();
    if (!cursor) return null;
    const [lon, lat] = cursor.lngLat;
    const lines = [...this.fieldData.activeLayers()]
      .sort((a, b) => a.order - b.order)
      .map((active) => {
        const values = active.grids.map((grid) =>
          grid.valueAt(lon, lat, active.layer.interpolation),
        );
        return { label: active.layer.label, value: active.layer.format(values) };
      });
    if (!lines.length) return null;
    return { point: cursor.point, lines };
  });
}
