import { PolygonPattern, PolygonStyle } from '../../engine/looks/polygons';
import { CloudEvent } from '../../types/polygons';
import { rgba } from '../../utils/color-scale';
import { EventAppearance } from './polygons-layer';
import { cbHover } from './cb';
import { applyPrecip, precipHover } from './precip';

const LEVELS = [
  { name: 'נמוכה', belowFt: 7000, pattern: PolygonPattern.Solid, color: '#535353', alphaRange: [0.5, 0.95] },
  { name: 'בינונית', belowFt: 20000, pattern: PolygonPattern.Solid, color: '#2748a5', alphaRange: [0.3, 0.8] },
  { name: 'גבוהה', belowFt: Infinity, pattern: PolygonPattern.Vertical, color: '#206ea3', alphaRange: [0.3, 0.8] },
];

export class Cloud implements EventAppearance<CloudEvent> {
  style(event: CloudEvent): PolygonStyle {
    const level = LEVELS.find((candidate) => event.baseFt < candidate.belowFt)!;
    const [thin, thick] = level.alphaRange;
    const cover = Math.min(8, Math.max(0, event.eights)) / 8;
    const alpha = Math.round(255 * (thin + (thick - thin) * cover));
    const style: PolygonStyle = {
      fill: rgba(level.color, alpha),
      outline: rgba('#ffffff', 160),
      outlineWidth: 1,
      pattern: level.pattern,
      text: this.text(event),
    };
    if (event.precip) applyPrecip(style, event.precip);
    return style;
  }

  hoverText(event: CloudEvent): string {
    const level = LEVELS.find((candidate) => event.baseFt < candidate.belowFt)!;
    const lines = [`עננות ${level.name} · ${event.eights}/8 · ${heightRange(event)}`];
    if (event.precip) lines.push(precipHover(event.precip));
    if (event.precip?.cb) lines.push(cbHover(event.precip.cb));
    return lines.join('\n');
  }

  private text(event: CloudEvent): string[] {
    const lines = [`${event.eights}/8`, heightRange(event)];
    if (event.precip) lines.push(`${event.precip.probability}%`);
    return lines ;
  }
}

function heightRange(event: CloudEvent): string {
  return `${thousands(event.baseFt)}-${thousands(event.topFt)}`;
}

function thousands(feet: number): string {
  return `${Number((feet / 1000).toFixed(1))}'`;
}
