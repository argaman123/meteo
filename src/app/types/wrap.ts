export type Bounds = [number, number, number, number];

export interface Wrap {
  rx: number;
  ry: number;
  start_x: number;
  start_y: number;
  wrap_info: {
    base_time: number;
    forecast_time: number;
    model: string;
    param: string;
    pressure: string | null;
    height: string | null;
  };
  values: (number | null)[][];
}
