import { PolygonPattern, PolygonStyle } from '../../engine/looks/polygons';
import { HazeEvent } from '../../types/polygons';
import { rgba } from '../../utils/color-scale';
import { EventAppearance } from './polygons-layer';
import { visibilityPosition, visibilityText } from './visibility';

export class Haze implements EventAppearance<HazeEvent> {
  name(event: HazeEvent): string {
    return event.height === 'surface' ? 'אובך קרקעי' : 'אובך גבוה';
  }

  style(event: HazeEvent): PolygonStyle {
    const surface = event.height === 'surface';
    const [thin, thick] = surface ? [0.5, 0.95] : [0.1, 0.5];
    const alpha = Math.round(255 * (thin + (thick - thin) * visibilityPosition(event)));
    return {
      fill: rgba(surface ? '#ff9800' : '#ffe33f', alpha),
      pattern: PolygonPattern.Solid,
      text: [`${event.minVis}-${event.maxVis} km`],
    };
  }

  hoverText(event: HazeEvent): string {
    return `${this.name(event)} · ${visibilityText(event)}`;
  }
}
