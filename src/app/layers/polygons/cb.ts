import { PolygonStyle } from '../../engine/looks/polygons';
import { CbEvent } from '../../types/polygons';
import { rgba } from '../../utils/color-scale';

const FILLS: Record<CbEvent['cbType'], string> = {
  scattered: '#ff0000',
  cb: '#c30000',
  cloudy: '#800000',
};

const NAMES: Record<CbEvent['cbType'], string> = {
  scattered: 'CB מפוזר',
  cb: 'CB',
  cloudy: 'CB מעונן',
};

export function applyCb(style: PolygonStyle, cb: CbEvent): void {
  const severity = Math.min(1, Math.max(0, cb.severity));
  style.fill = rgba(FILLS[cb.cbType], style.fill[3] ?? 255);
  style.outline = rgba(FILLS[cb.cbType]);
  style.outlineWidth = 4 + 4 * severity;
}

export function cbHover(cb: CbEvent): string {
  return `${NAMES[cb.cbType]} · עוצמה ${Math.round(cb.severity * 100)}%`;
}
