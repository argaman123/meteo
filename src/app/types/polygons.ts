export enum Sector {
  Center = 'center',
  North = 'north',
}

export interface CloudEvent {
  type: 'cloud';
  baseFt: number;
  topFt: number;
  eights: number;
  precip?: PrecipEvent;
}

export interface PrecipEvent {
  level: number;
  probability: number;
  cb?: CbEvent;
}

export interface CbEvent {
  cbType: 'scattered' | 'cb' | 'cloudy';
  severity: number;
}

export interface HazeEvent {
  type: 'haze';
  height: 'surface' | 'high';
  minVis: number;
  maxVis: number;
}

export interface FogEvent {
  type: 'fog';
  minVis: number;
  maxVis: number;
}

export type ForecastEvent = CloudEvent | HazeEvent | FogEvent;

export interface ForecastPolygon {
  coordinates: [number, number][];
  forecastEvents: ForecastEvent[];
}

export interface PolygonsWrap {
  startTime: number;
  endTime: number;
  sector: Sector;
  polygons: ForecastPolygon[];
}
