export interface ObservationPoint {
  lat: number;
  lon: number;
  value: number;
}

export interface CloudPoint extends ObservationPoint {
  base?: number;
}
