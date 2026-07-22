import type { Color } from '@deck.gl/core';
import { PolygonStyle } from '../../engine/looks/polygons';
import { PrecipEvent } from '../../types/polygons';
import { rgba } from '../../utils/color-scale';
import { applyCb } from './cb';

const RAMP = ['#d85283', '#e12d5d', '#e40e0e', '#c30000', '#800000'];

function precipSeverity(precip: PrecipEvent): number {
  return (Math.min(4, Math.max(1, precip.level)) - 1) / 3;
}

function precipColor(precip: PrecipEvent): Color {
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

export function applyPrecip(style: PolygonStyle, precip: PrecipEvent): void {
  style.outline = precipColor(precip);
  style.outlineWidth = 3 + 5 * precipSeverity(precip);
  if (precip.cb) applyCb(style, precip.cb);
}

export function precipHover(precip: PrecipEvent): string {
  return `גשם · רמה ${precip.level} · ${precip.probability}%`;
}
