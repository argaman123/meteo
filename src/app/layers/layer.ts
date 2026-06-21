import { Grid } from '../objects/grid';
import { Look } from './look';

export interface TimeWindow {
  backHours: number;
  forwardHours: number;
  stepHours: number;
}

export abstract class Layer {
  abstract readonly id: string;
  abstract readonly label: string;
  abstract readonly parameters: string[];
  abstract readonly looks: Look[];
  readonly interpolation: 'bilinear' | 'nearest' = 'bilinear';
  readonly timeWindow: TimeWindow = { backHours: 24, forwardHours: 96, stepHours: 3 };

  abstract format(values: number[]): string;
}

export interface RenderItem {
  id: string;
  look: Look;
  grids: Grid[];
  interpolation: 'bilinear' | 'nearest';
  opacity: number;
  order: number;
}
