import { PolygonPattern, PolygonStyle } from '../../engine/looks/polygons';
import { CbEvent, CloudEvent, Eights, PrecipitationEvent } from '../../types/polygons';
import { rgba } from '../../utils/color-scale';
import { Quantity, Unit, format, formatNumber } from '../../utils/units';
import { EventAppearance } from './polygons-layer';
import { applyCb, cbHover } from './cb';
import { applyPrecip, precipHover } from './precip';

const LEVELS = [
  { name: 'נמוכה', belowKft: 7, pattern: PolygonPattern.Solid, color: '#535353', alphaRange: [0.5, 0.95] },
  { name: 'בינונית', belowKft: 20, pattern: PolygonPattern.Solid, color: '#2748a5', alphaRange: [0.3, 0.8] },
  { name: 'גבוהה', belowKft: Infinity, pattern: PolygonPattern.Vertical, color: '#206ea3', alphaRange: [0.3, 0.8] },
];

export class Cloud implements EventAppearance<CloudEvent> {
  name(event: CloudEvent): string {
    return `עננות ${this.level(event).name}`;
  }

  style(event: CloudEvent): PolygonStyle {
    const level = this.level(event);
    const [thin, thick] = level.alphaRange;
    const [fewest, most] = eightsRange(event.parameters.cloud_eights);
    const cover = (fewest + most) / 2 / 8;
    const alpha = Math.round(255 * (thin + (thick - thin) * cover));
    const style: PolygonStyle = {
      fill: rgba(level.color, alpha),
      pattern: level.pattern,
      text: this.text(event),
    };
    const precip = precipOf(event);
    if (precip) applyPrecip(style, precip);
    const cb = cbOf(event);
    if (cb) applyCb(style, cb);
    return style;
  }

  hoverText(event: CloudEvent): string {
    const lines = [`${this.name(event)} · ${eightsText(event.parameters.cloud_eights)} · ${heightRange(event)}`];
    const precip = precipOf(event);
    if (precip) lines.push(precipHover(precip));
    const cb = cbOf(event);
    if (cb) lines.push(cbHover(cb));
    return lines.join('\n');
  }

  private level(event: CloudEvent) {
    return LEVELS.find((candidate) => event.parameters.cloudBase < candidate.belowKft)!;
  }

  private text(event: CloudEvent): string[] {
    const lines = [eightsText(event.parameters.cloud_eights), heightRange(event)];
    const precip = precipOf(event);
    if (precip) lines.push(`${precip.parameters.precip_prob}%`);
    return lines;
  }
}

function precipOf(event: CloudEvent): PrecipitationEvent | undefined {
  return event.events.find(
    (child): child is PrecipitationEvent => child.type === 'PRECIPITATION',
  );
}

function cbOf(event: CloudEvent): CbEvent | undefined {
  return (
    event.events.find((child): child is CbEvent => child.type === 'CB') ??
    precipOf(event)?.events.find((child) => child.type === 'CB')
  );
}

function eightsRange(eights: Eights): [number, number] {
  const digits = eights.slice(1);
  return digits.length === 1 ? [Number(digits), Number(digits)] : [Number(digits[0]), Number(digits[1])];
}

function eightsText(eights: Eights): string {
  const [fewest, most] = eightsRange(eights);
  const mostText = format(most, Quantity.CloudCover, Unit.Eighths);
  return fewest === most
    ? mostText
    : `${formatNumber(fewest, Quantity.CloudCover, Unit.Eighths)}-${mostText}`;
}

function heightRange(event: CloudEvent): string {
  const { cloudBase, cloudTop } = event.parameters;
  return `${format(cloudBase, Quantity.CloudBase, Unit.Kilofeet)}-${format(cloudTop, Quantity.CloudBase, Unit.Kilofeet)}`;
}
