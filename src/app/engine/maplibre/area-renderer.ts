// TODO: UNVERIFIED CODE BELOW
import maplibregl from 'maplibre-gl';
import type { AreaOverlay } from '../base/overlay';
import { GeoJsonRenderer, cssColor } from './overlay-renderer';

export class AreaRenderer extends GeoJsonRenderer<AreaOverlay> {

  protected featuresOf(overlay: AreaOverlay): GeoJSON.Feature[] {
    return overlay.areas.map((area) => ({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [area.polygon] },
      properties: { color: cssColor(area.color) },
    }));
  }

  protected layersOf(): maplibregl.LayerSpecification[] {
    return [
      {
        id: this.id,
        type: 'fill',
        source: this.source.id,
        filter: this.partFilter(),
        paint: { 'fill-color': ['get', 'color'] },
      },
    ];
  }
}
