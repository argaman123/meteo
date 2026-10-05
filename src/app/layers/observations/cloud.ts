import { signal } from '@angular/core';
import { gradientLegend } from '../../engine/base/look';
import { ColorStop, colorScale } from '../../utils/color-scale';
import { Quantity, Unit, format } from '../../utils/units';
import { Observation, ObservationParameter, paramValue } from './observations-layer';

const STOPS: ColorStop[] = [
  { value: 0, color: '#e2e8f0' },
  { value: 2, color: '#93c5fd' },
  { value: 4, color: '#38bdf8' },
  { value: 6, color: '#fb923c' },
  { value: 8, color: '#f87171' },
];

export const CLOUD: ObservationParameter = {
  parameter: 'CLOUD',
  label: 'עננות',
  colorScale: colorScale(STOPS, 'stepped'),
  legend: signal(gradientLegend(STOPS, Quantity.CloudCover, Unit.Eighths)),
  valueOf: (point) => Math.max(...cloudLayers(point).map((layer) => layer.cover)),
  textOf: (point) =>
    cloudLayers(point)
      .map(({ cover, base }) =>
        cover === 0 || Number.isNaN(base)
          ? format(cover, Quantity.CloudCover, Unit.Eighths)
          : `${format(cover, Quantity.CloudCover, Unit.Eighths)} ${format(base, Quantity.CloudBase, Unit.Meters)}`,
      )
      .join(' · '),
};

function cloudLayers(point: Observation): { cover: number; base: number }[] {
  return [1, 2, 3, 4]
    .map((layer) => ({
      cover: paramValue(point, `cloud_cover_${layer}`),
      base: paramValue(point, `cloud_base_${layer}`),
    }))
    .filter((layer) => !Number.isNaN(layer.cover));
}
