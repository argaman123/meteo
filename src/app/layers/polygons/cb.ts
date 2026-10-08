import { PolygonStyle } from '../../engine/looks/polygons';
import { CbEvent } from '../../types/polygons';
import { rgba } from '../../utils/color-scale';

const SEVERITY_ORDER = ['SCATTERED', 'CB', 'CLOUDY'];

const FILLS: Record<string, string> = {
  SCATTERED: '#ff0000',
  CB: '#c30000',
  CLOUDY: '#800000',
};

const NAMES: Record<string, string> = {
  SCATTERED: 'CB מפוזר',
  CB: 'CB',
  CLOUDY: 'CB מעונן',
};

export function applyCb(style: PolygonStyle, cb: CbEvent): void {
  const fill = FILLS[cb.parameters.cb_type] ?? FILLS['CB'];
  style.fill = rgba(fill, style.fill[3]);
  style.outline = rgba(fill);
  const severity = Math.max(0, SEVERITY_ORDER.indexOf(cb.parameters.cb_type)) / (SEVERITY_ORDER.length - 1);
  style.outlineWidth = 4 + 4 * severity;
}

export function cbHover(cb: CbEvent): string {
  return `${NAMES[cb.parameters.cb_type] ?? 'CB'} · ${cb.parameters.cb_prob}%`;
}
