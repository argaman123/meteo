import { signal } from '@angular/core';
import { LegendType } from '../../engine/base/look';
import { colorScale } from '../../utils/color-scale';
import { Quantity, Unit, format } from '../../utils/units';
import { ObservationParameter, paramValue } from './observations-layer';

const STOPS = [
  { value: 0.1, color: '#93c5fd', label: 'גשם קל' },
  { value: 1, color: '#4ade80', label: 'גשם' },
  { value: 4, color: '#fde047', label: 'גשם חזק' },
  { value: 8, color: '#f87171', label: 'גשם עז' },
];

export const RAIN: ObservationParameter = {
  parameter: 'RAIN',
  label: 'גשם',
  colorScale: colorScale(STOPS, 'stepped'),
  legend: signal({ type: LegendType.Swatches, stops: STOPS }),
  valueOf: (point) => paramValue(point, 'precipitation'),
  textOf: (point) =>
    format(paramValue(point, 'precipitation'), Quantity.Precipitation, Unit.Millimeters),
};
