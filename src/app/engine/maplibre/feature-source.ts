// TODO: UNVERIFIED CODE BELOW
import maplibregl from 'maplibre-gl';

export class FeatureSource {
  private readonly parts = new Map<string, GeoJSON.Feature[]>();

  constructor(
    private readonly map: maplibregl.Map,
    readonly id: string,
  ) {}

  setPart(part: string, features: GeoJSON.Feature[]): void {
    this.parts.set(
      part,
      features.map((feature) => ({ ...feature, properties: { ...feature.properties, part } })),
    );
  }

  removePart(part: string): void {
    this.parts.delete(part);
  }

  commit(): void {
    const source = this.map.getSource<maplibregl.GeoJSONSource>(this.id);
    if (!source && this.parts.size === 0) return;
    const data: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [...this.parts.values()].flat(),
    };
    if (source) source.setData(data);
    else this.map.addSource(this.id, { type: 'geojson', data, tolerance: 0, buffer: 256 });
  }

  destroy(): void {
    if (this.map.getSource(this.id)) this.map.removeSource(this.id);
  }
}
