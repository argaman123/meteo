import { Colormap } from '../../engine/looks/colormap';
import { Contours, levelsEvery } from '../../engine/looks/contours';
import { Grid } from '../../objects/grid';
import { Provider } from '../../objects/provider';
import { Parameter } from '../../types/parameter';
import { Quantity, Unit, format } from '../../utils/units';
import { ColorStop } from '../../utils/color-scale';
import { Control, options } from '../../utils/controls';
import { ModelLayer } from '../base/model-layer';

const PALETTE: ColorStop[] = [
  { value: -30, color: '#312e81' },
  { value: -15, color: '#1d4ed8' },
  { value: 0, color: '#0ea5e9' },
  { value: 10, color: '#34d399' },
  { value: 20, color: '#fbbf24' },
  { value: 30, color: '#f97316' },
  { value: 40, color: '#dc2626' },
];

export class Temperature extends ModelLayer {
  readonly name = 'טמפרטורה';
  readonly parameters = [Parameter.Temperature];
  override readonly model = options('wide', [
    { value: 'wide', label: 'רחב' },
    { value: 'local', label: 'מקומי' },
  ], 'מודל', true);
  override readonly controls: Control[] = [this.model];
  readonly looks = [
    {
      look: new Colormap(new Provider((grids: Grid[]) => grids[0]), PALETTE, 'smooth'),
      name: 'צבעים',
      checked: true,
    },
    {
      look: new Contours(new Provider((grids: Grid[]) => grids[0]), levelsEvery(5), String, '#f43f5e'),
      name: 'קונטורים',
      checked: false,
    },
  ];

  hover(grids: Grid[], lon: number, lat: number): string {
    return format(grids[0].valueAt(lon, lat, 'bilinear'), Quantity.Temperature, Unit.Celsius);
  }
}
