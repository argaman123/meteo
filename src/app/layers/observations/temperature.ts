import { ColorStop, colorScale } from '../../utils/color-scale';
import { Quantity, Unit, format } from '../../utils/units';
import { gradientLegend } from '../../engine/base/look';
import { ObservationParameter } from './observations-layer';

const STOPS: ColorStop[] = [
  { value: -30, color: '#818cf8' },
  { value: -15, color: '#60a5fa' },
  { value: 0, color: '#7dd3fc' },
  { value: 10, color: '#6ee7b7' },
  { value: 20, color: '#fde047' },
  { value: 30, color: '#fb923c' },
  { value: 40, color: '#f87171' },
];

export const TEMPERATURE: ObservationParameter = {
  parameter: 'temperature',
  label: 'טמפרטורה',
  colorScale: colorScale(STOPS, 'smooth'),
  legend: gradientLegend(STOPS, Quantity.Temperature, Unit.Celsius),
  textOf: (point) => format(point.value, Quantity.Temperature, Unit.Celsius),
};
