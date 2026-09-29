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
    const { fog_min_vis, fog_max_vis } = event.parameters;
    return {
      fill: rgba('#535353', Math.round(255 * (0.4 + 0.3 * visibilityPosition(fog_min_vis, fog_max_vis)))),
      pattern: PolygonPattern.Grid,
      text: [`${fog_min_vis}-${fog_max_vis} km`],
    };
  }

  hoverText(event: FogEvent): string {
    return `${this.name()} · ${visibilityText(event.parameters.fog_min_vis, event.parameters.fog_max_vis)}`;
  }
}
