export interface ObservationParam {
  name: string;
  value: number | string;
}

export interface ObservationPoint {
  coords: [[number, number]];
  params: ObservationParam[];
}
