import { Contours, levelsEvery } from '../engine/looks/contours';
import { Grid } from '../objects/grid';
import { Provider } from '../objects/provider';
import { Parameter } from '../types/parameter';
import { Quantity, Unit, format } from '../units/units';
import { Layer } from './layer';

export class Geopotential extends Layer {
  readonly name = 'גובה גיאופוטנציאלי';
  readonly parameters = [Parameter.GeopotentialHeight];
  readonly looks = [
    {
      look: new Contours(new Provider((grids) => grids[0]), levelsEvery(20), String, '#38bdf8'),
      name: 'קונטורים',
      defaultOn: true,
    },
  ];

  hover(grids: Grid[], lon: number, lat: number): string {
    return format(grids[0].valueAt(lon, lat, 'bilinear'), Quantity.GeopotentialHeight, Unit.Meters);
  }
}
