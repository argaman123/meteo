export interface AirLevelData {
  pressure: number;
  modelHeight: number;
  standardHeight: number;
  temperature: number;
  windDir: number;
  windStr: number;
  dewPoint: number;
  rh: number;
  ws: number;
}

export interface AirColumnTime {
  time: number;
  airLevelDataList: AirLevelData[];
}
