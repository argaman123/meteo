import { computed } from '@angular/core';
import { ColorStop, colorScale } from '../../utils/color-scale';
import { Quantity, Unit, format } from '../../utils/units';
import { gradientLegend } from '../../engine/base/look';
import { ObservationParameter, paramValue } from './observations-layer';

const STOPS: ColorStop[] = [
  { value: 0, color: '#cbd5e1' },
  { value: 10, color: '#7dd3fc' },
  { value: 20, color: '#6ee7b7' },
  { value: 30, color: '#fde047' },
  { value: 45, color: '#fb923c' },
  { value: 60, color: '#f87171' },
];

export const WIND: ObservationParameter = {
  parameter: 'WIND',
  label: 'רוח',
  colorScale: colorScale(STOPS, 'smooth'),
  legend: computed(() => gradientLegend(STOPS, Quantity.WindSpeed, Unit.Knots)),
  valueOf: (point) => paramValue(point, 'wind_speed'),
  textOf: (point) => format(paramValue(point, 'wind_speed'), Quantity.WindSpeed, Unit.Knots),
};
