import { Contours, levelsEvery } from '../../engine/looks/contours';
import { ModelLayer } from './model-layer';
import { Grid } from '../../objects/grid';
import { Provider } from '../../objects/provider';
import { Parameter } from '../../types/parameter';
import { Quantity, Unit, format } from '../../utils/units';

export class Geopotential extends ModelLayer {
  readonly name = 'גובה גיאופוטנציאלי';
  readonly parameters = [Parameter.GeopotentialHeight];

  protected override levelParam(level: number | string): Record<string, string> {
    return typeof level === 'string' ? { pressure: level } : {};
  }
  readonly looks = [
    {
      look: new Contours(new Provider((grids: Grid[]) => grids[0]), levelsEvery(20), String, '#38bdf8'),
      name: 'קונטורים',
      checked: true,
    },
  ];

  hover(grids: Grid[], lon: number, lat: number): string {
    return format(grids[0].valueAt(lon, lat, 'bilinear'), Quantity.GeopotentialHeight, Unit.Meters);
  }
}
