import { Colormap } from '../engine/looks/colormap';
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

class Temperature extends Layer {
  readonly id = 'temperature';
  readonly label = 'טמפרטורה';
  readonly parameter = 'temperature';
  readonly looks = [new Colormap(PALETTE, 'smooth')];
}

export const temperature = new Temperature();
