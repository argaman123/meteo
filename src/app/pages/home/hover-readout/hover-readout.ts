import { Component, computed, inject } from '@angular/core';
import { FieldData } from '../../../data/field-data';
import { MapEngine } from '../../../engine/map-engine';
import { LayersStore } from '../../../stores/layers-store';
import { formatParameterValue, formatWind } from '../../../units/units';
import { sampleGrid } from '../../../utils/grids';

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
    const lines = [...this.fieldData.loadedLayers()]
      .sort((a, b) => a.order - b.order)
      .map((layer) => {
        if (layer.entry.type === 'colormap') {
          const value = sampleGrid(layer.grids[layer.entry.parameter], lon, lat);
          return `${layer.entry.label}: ${formatParameterValue(layer.entry.parameter, value)}`;
        }
        const speed = sampleGrid(layer.grids[layer.entry.speedParameter], lon, lat);
        const direction = sampleGrid(layer.grids[layer.entry.directionParameter], lon, lat);
        return `${layer.entry.label}: ${formatWind(speed, direction)}`;
      });
    if (!lines.length) return null;
    return { point: cursor.point, lines };
  });
}
