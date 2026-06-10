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
  values: number[][];
}

export interface FieldGrid {
  parameter: string;
  units: string;
  runTime: string;
  forecastHours: number;
  bounds: [number, number, number, number];
  width: number;
  height: number;
  data: Float32Array;
}

export interface VectorField {
  bounds: [number, number, number, number];
  width: number;
  height: number;
  data: Float32Array;
}
