import { computed } from '@angular/core';
import { ColorStop, colorScale } from '../../utils/color-scale';
import { Quantity, Unit, format } from '../../utils/units';
import { gradientLegend } from '../../engine/base/look';
import { ObservationParameter } from './observations-layer';

const STOPS: ColorStop[] = [
  { value: 0, color: '#cbd5e1' },
  { value: 5, color: '#7dd3fc' },
  { value: 10, color: '#6ee7b7' },
  { value: 15, color: '#fde047' },
  { value: 22, color: '#fb923c' },
  { value: 30, color: '#f87171' },
];

export const WIND: ObservationParameter = {
  parameter: 'windSpeed',
  label: 'רוח',
  colorScale: colorScale(STOPS, 'smooth'),
  legend: computed(() => gradientLegend(STOPS, Quantity.WindSpeed, Unit.MetersPerSecond)),
  textOf: (point) => format(point.value, Quantity.WindSpeed, Unit.MetersPerSecond),
};
