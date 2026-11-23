import { Colormap } from '../../engine/looks/colormap';
import { Contours } from '../../engine/looks/contours';
import { levelsEvery } from '../../utils/contours';
import { Grid } from '../../objects/grid';
import { Provider } from '../../objects/provider';
import { Parameter } from '../../types/parameter';
import { Quantity, Unit } from '../../utils/units';
import { ColorStop } from '../../utils/color-scale';
import { ModelLayer } from './model-layer';

const RELATIVE_HUMIDITY_PALETTE: ColorStop[] = [
  { value: 0, color: '#050302' },
  { value: 45, color: '#1a0f06' },
  { value: 60, color: '#3a2410' },
  { value: 70, color: '#6b5a24' },
  { value: 80, color: '#9cc864' },
  { value: 90, color: '#d4f5bf' },
  { value: 100, color: '#ffffff' },
];

export class RelativeHumidity extends ModelLayer {
  readonly name = 'לחות יחסית';
  override readonly timeWindow = { backHours: 24, forwardHours: 96, stepHours: 1 };
  readonly parameters = [Parameter.RelativeHumidity];
  protected readonly quantity = Quantity.RelativeHumidity;
  protected readonly unit = Unit.Percent;
  readonly looks = [
    {
      look: new Colormap(
        new Provider((grids: Grid[]) => grids[0]),
        { stops: RELATIVE_HUMIDITY_PALETTE, style: 'smooth' },
        this.label,
      ),
      name: 'צבעים',
      checked: true,
    },
    {
      look: new Contours(
        new Provider((grids: Grid[]) => grids[0]),
        levelsEvery(10),
        this.label,
        '#4ade80',
      ),
      name: 'קונטורים',
      checked: true,
    },
  ];
}
