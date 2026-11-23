import { Contours } from '../../engine/looks/contours';
import { Labels } from '../../engine/looks/labels';
import { Grid } from '../../objects/grid';
import { Provider } from '../../objects/provider';
import { Parameter } from '../../types/parameter';
import { levelsEvery } from '../../utils/contours';
import { Control, OptionsPresentation, options } from '../../utils/controls';
import { Quantity, Unit, formatNumber } from '../../utils/units';
import { ModelLayer } from './model-layer';

export class SeaLevelPressure extends ModelLayer {
  readonly name = 'לחץ מפלס ים';
  override readonly timeWindow = { backHours: 24, forwardHours: 96, stepHours: 1 };
  readonly parameters = [Parameter.SeaLevelPressure];
  protected readonly quantity = Quantity.Pressure;
  protected readonly unit = Unit.Millibars;
  override readonly staticLevel = true;
  protected override readonly reduction = 1;
  readonly smoothed = options(
    false,
    [
      { value: false, label: 'מפורט' },
      { value: true, label: 'כללי' },
    ],
    'פירוט',
    OptionsPresentation.Table,
  );
  override readonly controls: Control[] = [this.smoothed];
  readonly looks = [
    {
      look: new Contours(
        new Provider((grids: Grid[]) => this.pressureGrid(grids)),
        levelsEvery(2),
        this.label,
        '#e5e7eb',
      ),
      name: 'קונטורים',
      checked: true,
    },
    {
      look: new Labels(
        new Provider((grids: Grid[]) => ({
          points: this.overviewGrid(grids)
            .extrema(6)
            .map(({ lon, lat, kind }) => ({
              lon,
              lat,
              text: `${kind === 'maximum' ? 'H' : 'L'} ${formatNumber(grids[0].valueAt(lon, lat, 'bilinear'), this.quantity, this.unit)}`,
              color: kind === 'maximum' ? '#f87171' : '#60a5fa',
            })),
        })),
      ),
      name: 'מרכזים',
      checked: true,
    },
  ];

  private pressureGrid(grids: Grid[]): Grid {
    return this.smoothed() ? this.overviewGrid(grids) : grids[0];
  }

  private overviewGrid(grids: Grid[]): Grid {
    return grids[0].resampled(70, 70).smoothed(16);
  }
}
