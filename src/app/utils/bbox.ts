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

export function coveredFraction(view: Bounds, coverage: Bounds): number {
  const west = Math.max(view[0], coverage[0]);
  const south = Math.max(view[1], coverage[1]);
  const east = Math.min(view[2], coverage[2]);
  const north = Math.min(view[3], coverage[3]);
  if (west >= east || south >= north) return 0;
  const intersectionArea = (east - west) * (north - south);
  const viewArea = (view[2] - view[0]) * (view[3] - view[1]);
  return intersectionArea / viewArea;
}
