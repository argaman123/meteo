import { Quantity, Unit, format } from '../../utils/units';

export const VISIBILITY_BANDS: { minVis: number; maxVis: number }[] = [
  { minVis: 5, maxVis: 10 },
  { minVis: 1, maxVis: 5 },
  { minVis: 0.5, maxVis: 1 },
  { minVis: 0.2, maxVis: 0.5 },
  { minVis: 0, maxVis: 0.2 },
];

export function visibilityPosition(minVis: number, maxVis: number): number {
  const index = VISIBILITY_BANDS.findIndex(
    (band) => band.minVis === minVis && band.maxVis === maxVis,
  );
  const fallback = Math.floor(VISIBILITY_BANDS.length / 2);
  return (index < 0 ? fallback : index) / (VISIBILITY_BANDS.length - 1);
}

export function visibilityText(minVis: number, maxVis: number): string {
  return `ראות ${format(minVis, Quantity.Visibility, Unit.Kilometers)}-${format(maxVis, Quantity.Visibility, Unit.Kilometers)}`;
}
