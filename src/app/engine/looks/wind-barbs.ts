import { Unit, convertBetween } from '../../utils/units';
import { metDirection, windBarbPath } from '../../utils/wind';
import { GridIcon, GridIcons } from '../base/grid-icons';

export class WindBarbs extends GridIcons {
  protected readonly sizeFactor = 1.1;

  protected iconAt(eastward: number, northward: number, lat: number): GridIcon {
    const knots = Math.round(convertBetween(Math.hypot(eastward, northward), Unit.MetersPerSecond, Unit.Knots) / 5) * 5;
    const southern = lat < 0;
    return {
      key: `${knots} ${southern}`,
      angle: metDirection(eastward, northward),
      draw: (context) => {
        const scale = 128 / 26;
        context.translate(64, 64);
        context.scale(southern ? -scale : scale, scale);
        if (knots < 5) {
          context.arc(0, 0, 1.25, 0, 2 * Math.PI);
          context.fill();
        } else {
          context.translate(0, 10);
          const path = new Path2D(windBarbPath(knots));
          context.lineWidth = 1.25;
          context.lineCap = 'round';
          context.lineJoin = 'round';
          context.fill(path, 'evenodd');
          context.stroke(path);
        }
      },
    };
  }
}
