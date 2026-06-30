import { Colormap } from '../engine/looks/colormap';
import { Grid } from '../objects/grid';
import { Provider } from '../objects/provider';
import { Parameter } from '../types/parameter';
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
  readonly parameters = [Parameter.U, Parameter.V];
  readonly looks = [
    new Colormap(new Provider((grids) => Grid.combine(grids, Math.hypot)), SPEED_PALETTE, 'smooth', 0.55),
  ];
}
