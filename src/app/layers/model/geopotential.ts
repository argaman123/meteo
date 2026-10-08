import { Contours } from '../../engine/looks/contours';
import { levelsEvery } from '../../utils/contours';
import { ModelLayer } from './model-layer';
import { Grid } from '../../objects/grid';
import { Provider } from '../../objects/provider';
import { Level } from '../../services/level-service';
import { Parameter } from '../../types/parameter';
import { Quantity, Unit } from '../../utils/units';

export class Geopotential extends ModelLayer {
  readonly name = 'גובה גיאופוטנציאלי';
  override readonly timeWindow = { backHours: 24, forwardHours: 96, stepHours: 1 };
  readonly parameters = [Parameter.GeopotentialHeight];
  protected readonly quantity = Quantity.GeopotentialHeight;
  protected readonly unit = Unit.Meters;

  protected override levelOf(level: Level | null): Level | undefined {
    return typeof level === 'number' ? undefined : (level ?? 'SFC');
  }
  readonly looks = [
    {
      look: new Contours(new Provider((grids: Grid[]) => grids[0]), levelsEvery(20), this.label, '#38bdf8'),
      name: 'קונטורים',
      checked: true,
    },
  ];
}
