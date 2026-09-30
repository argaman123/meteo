import { Arrows } from '../../engine/looks/arrows';
import { Colormap } from '../../engine/looks/colormap';
import { Contours } from '../../engine/looks/contours';
import { WaveCrests } from '../../engine/looks/wave-crests';
import { Grid, VectorField } from '../../objects/grid';
import { Provider } from '../../objects/provider';
import { Model, Parameter } from '../../types/parameter';
import { levelsEvery } from '../../utils/contours';
import { Control, OptionsPresentation, options } from '../../utils/controls';
import { Quantity, Unit, format } from '../../utils/units';
import { ColorStop } from '../../utils/color-scale';
import { ModelLayer } from './model-layer';

const WAVE_HEIGHT_PALETTE: ColorStop[] = [
  { value: 0, color: '#1e3a8a' },
  { value: 0.5, color: '#2563eb' },
  { value: 1, color: '#0891b2' },
  { value: 1.5, color: '#16a34a' },
  { value: 2.5, color: '#ca8a04' },
  { value: 4, color: '#ea580c' },
  { value: 6, color: '#dc2626' },
  { value: 8, color: '#9333ea' },
];

export class Waves extends ModelLayer {
  readonly name = 'גלים';
  readonly parameters = [Parameter.WaveHeight, Parameter.WaveDirection];
  override readonly staticLevel = true;
  readonly model = options(
    Model.Wave,
    [{ value: Model.Wave, label: 'ECMWF' }],
    'מודל',
    OptionsPresentation.Select,
  );
  override readonly controls: Control[] = [this.model];
  readonly looks = [
    {
      look: new Colormap(
        new Provider((grids: Grid[]) => grids[0]),
        { stops: WAVE_HEIGHT_PALETTE, style: 'smooth' },
        (value) => format(value, Quantity.WaveHeight, Unit.Meters),
        { blur: true },
      ),
      name: 'צבעים',
      checked: true,
    },
    {
      look: new WaveCrests(new Provider((grids: Grid[]) => this.travelField(grids))),
      name: 'אנימציה',
      checked: true,
    },
    {
      look: new Contours(
        new Provider((grids: Grid[]) => grids[0]),
        levelsEvery(0.5),
        (value) => format(value, Quantity.WaveHeight, Unit.Meters),
        '#22d3ee',
      ),
      name: 'קונטורים',
      checked: false,
    },
    {
      look: new Arrows(new Provider((grids: Grid[]) => this.travelField(grids)), 3),
      name: 'חיצים',
      checked: false,
    },
  ];

  hover(grids: Grid[], lon: number, lat: number): string {
    const height = grids[0].valueAt(lon, lat, 'bilinear');
    const direction = grids[1].valueAt(lon, lat, 'nearest');
    if (Number.isNaN(height) || Number.isNaN(direction))
      return format(NaN, Quantity.WaveHeight, Unit.Meters);
    return `${format(height, Quantity.WaveHeight, Unit.Meters)} · ${format(direction, Quantity.Direction, Unit.MetDegrees)}`;
  }

  protected override modelOf(): Model {
    return this.model();
  }

  private travelField([height, direction]: Grid[]): VectorField {
    const radians = (degrees: number) => (degrees * Math.PI) / 180;
    return {
      u: Grid.combine([height, direction], (meters, from) => -meters * Math.sin(radians(from))),
      v: Grid.combine([height, direction], (meters, from) => -meters * Math.cos(radians(from))),
    };
  }
}
