export type Bounds = [number, number, number, number];

export interface Wrap<I> {
  rx: number;
  ry: number;
  start_x: number;
  start_y: number;
  wrap_info: I;
  values: (number | null)[][];
}

export interface ModelWrapInfo {
  info_type: 'model';
  base_time: number;
  forecast_time: number;
  model: string;
  param: string;
  pressure: string;
  height: string | number;
}

export interface RadarWrapInfo {
  info_type: 'radar';
  name: string;
  time: number;
  type: string;
}
