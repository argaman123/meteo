import { Colormap } from '../engine/looks/colormap';
import { Contours } from '../engine/looks/contours';
import { WindField, WindParticles } from '../engine/looks/wind-particles';
import { Grid } from '../objects/grid';
import { Provider } from '../objects/provider';
import { Parameter } from '../types/parameter';
import { Quantity, Unit, convert, format } from '../units/units';
import { ColorStop } from '../utils/color-scale';
import { Layer } from './layer';

const SPEED_PALETTE: ColorStop[] = [
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

export class Wind extends Layer {
  readonly name = 'רוח';
  readonly parameters = [Parameter.U, Parameter.V];
  readonly looks = [
    {
      look: new Colormap(
        new Provider((grids) => Grid.combine(grids, Math.hypot)),
        SPEED_PALETTE, 'smooth', 0.55,),
      name: 'צבעים',
      defaultOn: false,
    },
    {
      look: new WindParticles(new Provider((grids): WindField => ({ u: grids[0], v: grids[1] }))),
      name: 'אנימציה',
      defaultOn: true,
    },
    {
      look: new Contours(
        new Provider((grids) => Grid.combine(grids, (u, v) =>
            convert(Math.hypot(u, v), Quantity.WindSpeed, Unit.MetersPerSecond),),),
        () => [10, 20, 30, 40, 50], String, '#a855f7',),
      name: 'קונטורים',
      defaultOn: false,
    },
  ];

  hover(grids: Grid[], lon: number, lat: number): string {
    const u = grids[0].valueAt(lon, lat, 'bilinear');
    const v = grids[1].valueAt(lon, lat, 'bilinear');
    const speed = Math.hypot(u, v);
    if (Number.isNaN(speed)) return format(NaN, Quantity.WindSpeed, Unit.MetersPerSecond);
    const direction = 270 - (Math.atan2(v, u) * 180) / Math.PI;
    return `${format(speed, Quantity.WindSpeed, Unit.MetersPerSecond)} · ${format(direction, Quantity.Direction, Unit.MetDegrees)}`;
  }
}
