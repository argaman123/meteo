import { bboxClip } from '@turf/bbox-clip';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { point, polygon } from '@turf/helpers';
import { Bounds } from '../types/wrap';
import { ForecastEvent, ForecastPolygon, PolygonsState } from '../types/polygons';

export class PolygonMap {
  private constructor(
    readonly areas: ForecastPolygon[],
    readonly startTime: number,
  ) {}

  static fromState(state: PolygonsState, bounds: Bounds): PolygonMap {
    const areas: ForecastPolygon[] = [];
    for (const shape of state.polygons) {
      for (const clipped of clipToBounds(shape.coordinates, bounds)) {
        areas.push({ ...shape, coordinates: clipped });
      }
    }
    return new PolygonMap(areas, state.startTime);
  }

  eventsAt(lon: number, lat: number): ForecastEvent[] {
    const cursor = point([lon, lat]);
    return this.areas
      .filter((area) => booleanPointInPolygon(cursor, polygon([area.coordinates])))
      .flatMap((area) => area.forecastEvents);
  }
}

function clipToBounds(ring: [number, number][], bounds: Bounds): [number, number][][] {
  const clipped = bboxClip(polygon([ring]), bounds).geometry;
  const shapes = clipped.type === 'Polygon' ? [clipped.coordinates] : clipped.coordinates;
  return shapes
    .map((rings) => rings[0] as [number, number][])
    .filter((outer) => outer.length >= 4);
}
