import { Contours } from '../../engine/looks/contours';
import { levelsEvery } from '../../utils/contours';
import { ModelLayer } from './model-layer';
import { Grid } from '../../objects/grid';
import { Provider } from '../../objects/provider';
import { Level } from '../../services/level-service';
import { Parameter } from '../../types/parameter';
import { Quantity, Unit, format } from '../../utils/units';

export class Geopotential extends ModelLayer {
  readonly name = 'גובה גיאופוטנציאלי';
  readonly parameters = [Parameter.GeopotentialHeight];

  protected override levelOf(level: Level | null): Level | undefined {
    return typeof level === 'number' ? undefined : (level ?? 'SFC');
  }
  readonly looks = [
    {
      look: new Contours(new Provider((grids: Grid[]) => grids[0]), levelsEvery(20), (value) => format(value, Quantity.GeopotentialHeight, Unit.Meters), '#38bdf8'),
      name: 'קונטורים',
      checked: true,
    },
  ];

  hover(grids: Grid[], lon: number, lat: number): string {
    return format(grids[0].valueAt(lon, lat, 'bilinear'), Quantity.GeopotentialHeight, Unit.Meters);
  }
}
