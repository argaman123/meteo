import { Colormap } from '../../engine/looks/colormap';
import { Contours } from '../../engine/looks/contours';
import { WindBarbs } from '../../engine/looks/wind-barbs';
import { WindField, WindParticles } from '../../engine/looks/wind-particles';
import { Grid } from '../../objects/grid';
import { Provider } from '../../objects/provider';
import { Parameter } from '../../types/parameter';
import { Quantity, Unit, convert, format, unitLabel } from '../../utils/units';
import { ColorStop } from '../../utils/color-scale';
import { metDirection } from '../../utils/wind';
import { ModelLayer } from './model-layer';

export const WIND_SPEED_PALETTE: ColorStop[] = [
  { value: 0, color: '#6271b7' },
  { value: 1, color: '#39619f' },
  { value: 3, color: '#4a94a9' },
  { value: 5, color: '#4d8d7b' },
  { value: 7, color: '#53a553' },
  { value: 9, color: '#359f35' },
  { value: 11, color: '#a79d51' },
  { value: 13, color: '#9f7f3a' },
  { value: 15, color: '#a16c5c' },
  { value: 17, color: '#813a4e' },
  { value: 19, color: '#af5088' },
  { value: 21, color: '#754a93' },
  { value: 24, color: '#6d61a3' },
];

export class Wind extends ModelLayer {
  readonly name = 'רוח';
  readonly parameters = [Parameter.U, Parameter.V];
  readonly looks = [
    {
      look: new Colormap(
        new Provider((grids: Grid[]) => Grid.combine(grids, Math.hypot)),
        { stops: WIND_SPEED_PALETTE, style: 'smooth' },
        (value) => format(value, Quantity.WindSpeed, Unit.MetersPerSecond),
        { opacity: 0.55 },
      ),
      name: 'צבעים',
      checked: false,
    },
    {
      look: new WindParticles(
        new Provider((grids: Grid[]): WindField => ({ u: grids[0], v: grids[1] })),
      ),
      name: 'אנימציה',
      checked: true,
    },
    {
      look: new Contours(
        new Provider((grids: Grid[]) => Grid.combine(grids, (u, v) =>
            convert(Math.hypot(u, v), Quantity.WindSpeed, Unit.MetersPerSecond),),),
        () => [10, 20, 30, 40, 50], (value) => `${value} ${unitLabel(Quantity.WindSpeed)}`, '#a855f7',),
      name: 'קונטורים',
      checked: false,
    },
    {
      look: new WindBarbs(
        new Provider((grids: Grid[]): WindField => ({ u: grids[0], v: grids[1] })),
      ),
      name: 'דגלונים',
      checked: false,
    },
  ];

  hover(grids: Grid[], lon: number, lat: number): string {
    const u = grids[0].valueAt(lon, lat, 'bilinear');
    const v = grids[1].valueAt(lon, lat, 'bilinear');
    const speed = Math.hypot(u, v);
    if (Number.isNaN(speed)) return format(NaN, Quantity.WindSpeed, Unit.MetersPerSecond);
    return `${format(speed, Quantity.WindSpeed, Unit.MetersPerSecond)} · ${format(metDirection(u, v), Quantity.Direction, Unit.MetDegrees)}`;
  }
}
