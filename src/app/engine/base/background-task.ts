// TODO: UNVERIFIED CODE BELOW
import { Bounds } from '../../types/wrap';
import { ColorStop, PaletteStyle } from '../../utils/color-scale';

export enum BackgroundTask {
  Image = 'image',
  Contours = 'contours',
}

export interface GridValues {
  values: Float32Array;
  width: number;
  height: number;
  bounds: Bounds;
}

export interface ImageTask extends GridValues {
  kind: BackgroundTask.Image;
  palette: ColorStop[];
  style: PaletteStyle;
  interpolation: 'bilinear' | 'nearest';
  minimumValue: number;
  absolute: boolean;
  blur: boolean;
}

export interface ContoursTask extends GridValues {
  kind: BackgroundTask.Contours;
  levels: number[];
}

export interface BackgroundJob {
  id: number;
  task: ImageTask | ContoursTask;
}
