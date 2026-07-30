import { bboxClip } from '@turf/bbox-clip';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { point, polygon } from '@turf/helpers';
import { Bounds } from '../types/wrap';
import { ForecastEvent, ForecastPolygon, PolygonsWrap } from '../types/polygons';

export class PolygonMap {
  private constructor(
    readonly areas: ForecastPolygon[],
    readonly startTime: number,
    readonly endTime: number,
  ) {}

  static fromWrap(wrap: PolygonsWrap, bounds: Bounds): PolygonMap {
    const areas: ForecastPolygon[] = [];
    for (const shape of wrap.polygons) {
      const ring = flipCoordinates(shape.coordinates);
      for (const clipped of clipToBounds(ring, bounds)) {
        areas.push({ coordinates: clipped, forecastEvents: shape.forecastEvents });
      }
    }
    return new PolygonMap(areas, wrap.startTime, wrap.endTime);
  }

  eventsAt(lon: number, lat: number): ForecastEvent[] {
    const cursor = point([lon, lat]);
    return this.areas
      .filter((area) => booleanPointInPolygon(cursor, polygon([area.coordinates])))
      .flatMap((area) => area.forecastEvents);
  }
}

function flipCoordinates(coordinates: [number, number][]): [number, number][] {
  return coordinates.map(([lat, lon]) => [lon, lat]);
}

function clipToBounds(ring: [number, number][], bounds: Bounds): [number, number][][] {
  const clipped = bboxClip(polygon([ring]), bounds).geometry;
  const shapes = clipped.type === 'Polygon' ? [clipped.coordinates] : clipped.coordinates;
  return shapes
    .map((rings) => rings[0] as [number, number][])
    .filter((outer) => outer.length >= 4);
}
