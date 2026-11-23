// TODO: UNVERIFIED CODE BELOW
import maplibregl from 'maplibre-gl';
import type { LineOverlay } from '../base/overlay';
import { GeoJsonRenderer, cssColor } from './overlay-renderer';

export class LineRenderer extends GeoJsonRenderer<LineOverlay> {

  protected featuresOf(overlay: LineOverlay): GeoJSON.Feature[] {
    return overlay.lines
      .filter((line) => line.path.length > 1)
      .map((line) => ({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: line.path },
        properties: { color: cssColor(line.color), width: line.width },
      }));
  }

  protected layersOf(overlay: LineOverlay): maplibregl.LayerSpecification[] {
    return [
      {
        id: this.id,
        type: 'line',
        source: this.source.id,
        filter: this.partFilter(),
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width'],
          ...(overlay.dashed ? { 'line-dasharray': [4, 3] } : {}),
        },
      },
    ];
  }
}
