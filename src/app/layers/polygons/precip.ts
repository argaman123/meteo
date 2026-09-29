import type { Color } from '@deck.gl/core';
import { PolygonStyle } from '../../engine/looks/polygons';
import { PrecipitationEvent, PrecipType } from '../../types/polygons';
import { rgba } from '../../utils/color-scale';

const RAMP = ['#d85283', '#e12d5d', '#e40e0e', '#c30000', '#800000'];

const RAIN_TYPES: { type: PrecipType; name: string }[] = [
  { type: 'VIRGOT', name: 'וירגה' },
  { type: 'DRIPPING', name: 'טפטוף' },
  { type: 'DRIPPING_MEDIUM_RAIN', name: 'טפטוף עד גשם בינוני' },
  { type: 'MEDIUM_RAIN', name: 'גשם בינוני' },
  { type: 'MEDIUM_HIGH_RAIN', name: 'גשם בינוני עד חזק' },
  { type: 'HEAVY_RAIN', name: 'גשם חזק' },
];

function rainIndex(precip: PrecipitationEvent): number {
  return RAIN_TYPES.findIndex((rain) => rain.type === precip.parameters.precip_type);
}

function precipSeverity(precip: PrecipitationEvent): number {
  return rainIndex(precip) / (RAIN_TYPES.length - 1);
}

function precipColor(precip: PrecipitationEvent): Color {
  const position = precipSeverity(precip) * (RAMP.length - 1);
  const below = rgba(RAMP[Math.floor(position)]);
  const above = rgba(RAMP[Math.ceil(position)]);
  const blend = position - Math.floor(position);
  return [
    Math.round(below[0] + (above[0] - below[0]) * blend),
    Math.round(below[1] + (above[1] - below[1]) * blend),
    Math.round(below[2] + (above[2] - below[2]) * blend),
    240,
  ];
}

export function applyPrecip(style: PolygonStyle, precip: PrecipitationEvent): void {
  style.outline = precipColor(precip);
  style.outlineWidth = 3 + 5 * precipSeverity(precip);
}

export function precipHover(precip: PrecipitationEvent): string {
  return `${RAIN_TYPES[rainIndex(precip)].name} · ${precip.parameters.precip_prob}%`;
}
