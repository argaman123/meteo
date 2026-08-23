import { gradientLegend } from '../../engine/base/look';
import { CloudPoint } from '../../types/observations';
import { ColorStop, colorScale } from '../../utils/color-scale';
import { Quantity, Unit, format } from '../../utils/units';
import { ObservationParameter } from './observations-layer';

const STOPS: ColorStop[] = [
  { value: 0, color: '#e2e8f0' },
  { value: 2, color: '#93c5fd' },
  { value: 4, color: '#38bdf8' },
  { value: 6, color: '#fb923c' },
  { value: 8, color: '#f87171' },
];

export const CLOUD: ObservationParameter = {
  parameter: 'cloud',
  label: 'עננות',
  colorScale: colorScale(STOPS, 'stepped'),
  legend: gradientLegend(STOPS, Quantity.CloudCover, Unit.Eighths),
  textOf: (point) => {
    const { value, base } = point as CloudPoint;
    return base === undefined || value === 0
      ? format(value, Quantity.CloudCover, Unit.Eighths)
      : `${format(value, Quantity.CloudCover, Unit.Eighths)} ${format(base, Quantity.CloudBase, Unit.Feet)}`;
  },
};
