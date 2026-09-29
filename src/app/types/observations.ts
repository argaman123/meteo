export interface ObservationParam {
  name: string;
  value: number;
}

export interface ObservationPoint {
  coords: [[number, number]];
  params: ObservationParam[];
}
