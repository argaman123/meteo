export type Bounds = [number, number, number, number];

export interface FieldGridDocument {
  parameter: string;
  level: string;
  units: string;
  runTime: string;
  forecastHours: number;
  startLat: number;
  startLon: number;
  deltaLat: number;
  deltaLon: number;
  rows: number;
  cols: number;
  values: (number | null)[][];
}

export interface FieldGrid {
  parameter: string;
  units: string;
  bounds: Bounds;
  width: number;
  height: number;
  data: Float32Array;
}

export interface VectorField {
  bounds: Bounds;
  width: number;
  height: number;
  data: Float32Array;
}
