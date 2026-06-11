import { Bounds } from '../types/field-grid';

const MERCATOR_LATITUDE_LIMIT = 85;

export function expandBounds(bounds: Bounds, factor: number): Bounds {
  const [west, south, east, north] = bounds;
  const lonPadding = (east - west) * factor;
  const latPadding = (north - south) * factor;
  return [
    west - lonPadding,
    Math.max(-MERCATOR_LATITUDE_LIMIT, south - latPadding),
    east + lonPadding,
    Math.min(MERCATOR_LATITUDE_LIMIT, north + latPadding),
  ];
}

export function containsBounds(outer: Bounds, inner: Bounds): boolean {
  return (
    inner[0] >= outer[0] && inner[1] >= outer[1] && inner[2] <= outer[2] && inner[3] <= outer[3]
  );
}
