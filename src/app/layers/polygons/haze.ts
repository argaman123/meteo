import { PolygonPattern, PolygonStyle } from '../../engine/looks/polygons';
import { HazeEvent } from '../../types/polygons';
import { rgba } from '../../utils/color-scale';
import { EventAppearance } from './polygons-layer';
import { visibilityPosition, visibilityText } from './visibility';

export class Haze implements EventAppearance<HazeEvent> {
  name(event: HazeEvent): string {
    return this.isSurface(event) ? 'אובך קרקעי' : 'אובך גבוה';
  }

  style(event: HazeEvent): PolygonStyle {
    const surface = this.isSurface(event);
    const { haze_min_vis, haze_max_vis } = event.parameters;
    const [thin, thick] = surface ? [0.5, 0.95] : [0.1, 0.5];
    const alpha = Math.round(255 * (thin + (thick - thin) * visibilityPosition(haze_min_vis, haze_max_vis)));
    return {
      fill: rgba(surface ? '#ff9800' : '#ffe33f', alpha),
      pattern: PolygonPattern.Solid,
      text: [visibilityText(haze_min_vis, haze_max_vis)],
    };
  }

  hoverText(event: HazeEvent): string {
    return `${this.name(event)} · ראות ${visibilityText(event.parameters.haze_min_vis, event.parameters.haze_max_vis)}`;
  }

  private isSurface(event: HazeEvent): boolean {
    return !event.parameters.haze_base;
  }
}
