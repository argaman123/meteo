import { Colormap } from '../engine/looks/colormap';
import { Grid } from '../objects/grid';
import { Provider } from '../objects/provider';
import { Parameter } from '../types/parameter';
import { Unit, format } from '../units/units';
import { ColorStop } from '../utils/color-scale';
import { Layer } from './layer';

const PALETTE: ColorStop[] = [
  { value: -30, color: '#312e81' },
  { value: -15, color: '#1d4ed8' },
  { value: 0, color: '#0ea5e9' },
  { value: 10, color: '#34d399' },
  { value: 20, color: '#fbbf24' },
  { value: 30, color: '#f97316' },
  { value: 40, color: '#dc2626' },
];

export class Temperature extends Layer {
  readonly parameters = [Parameter.Temperature];
  readonly looks = [new Colormap(new Provider((grids) => grids[0]), PALETTE, 'smooth')];

  hover(grids: Grid[], lon: number, lat: number): string {
    return format(grids[0].valueAt(lon, lat, 'bilinear'), Unit.Celsius);
  }
}
