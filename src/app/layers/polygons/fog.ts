import { PolygonPattern, PolygonStyle } from '../../engine/looks/polygons';
import { FogEvent } from '../../types/polygons';
import { rgba } from '../../utils/color-scale';
import { EventAppearance } from './polygons-layer';
import { visibilityPosition, visibilityText } from './visibility';

export class Fog implements EventAppearance<FogEvent> {
  name(): string {
    return 'ערפל';
  }

  style(event: FogEvent): PolygonStyle {
    return {
      fill: rgba('#535353', Math.round(255 * (0.4 + 0.3 * visibilityPosition(event)))),
      pattern: PolygonPattern.Grid,
      text: [`${event.minVis}-${event.maxVis} km`],
    };
  }

  hoverText(event: FogEvent): string {
    return `${this.name()} · ${visibilityText(event)}`;
  }
}
