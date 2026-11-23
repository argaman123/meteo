export enum Sector {
  Dev = 'SECTOR-DEV',
  Big = 'SECTOR-BIG',
}

export enum PolygonsStatus {
  Saved = 'SAVED',
  Distributed = 'DISTRIBUTED',
}

export type Eights = 'E0' | 'E02' | 'E13' | 'E24' | 'E35' | 'E46' | 'E57' | 'E68' | 'E8';

export type PrecipType =
  | 'VIRGOT'
  | 'DRIPPING'
  | 'DRIPPING_MEDIUM_RAIN'
  | 'MEDIUM_RAIN'
  | 'MEDIUM_HIGH_RAIN'
  | 'HEAVY_RAIN';

export interface CloudEvent {
  type: 'CLOUD';
  parameters: {
    cloudBase: number;
    cloudTop: number;
    cloud_eights: Eights;
    cloud_prob?: number;
  };
  events: (PrecipitationEvent | CbEvent | FogEvent)[];
}

export interface PrecipitationEvent {
  type: 'PRECIPITATION';
  parameters: {
    precip_type: PrecipType;
    precip_prob: number;
  };
  events: CbEvent[];
}

export interface CbEvent {
  type: 'CB';
  parameters: {
    cb_type: string;
    cb_prob: number;
  };
  events: [];
}

export interface FogEvent {
  type: 'FOG';
  parameters: {
    fog_min_vis: number;
    fog_max_vis: number;
    fog_prob?: number;
  };
  events: [];
}

export interface HazeEvent {
  type: 'HAZE';
  parameters: {
    haze_min_vis: number;
    haze_max_vis: number;
    haze_base?: number;
    haze_top?: number;
    haze_prob?: number;
  };
  events: [];
}

export type ForecastEvent = CloudEvent | HazeEvent;

export interface ForecastPolygon {
  coordinates: [number, number][];
  forecastEvents: ForecastEvent[];
  status: PolygonsStatus;
}

export interface PolygonsState {
  startTime: number;
  endTime: number;
  sector: Sector;
  status: PolygonsStatus;
  timeEdited: number;
  polygons: ForecastPolygon[];
}

export interface MapTime {
  startTime: number;
  status: PolygonsStatus;
  timeSaved: number;
}

export interface PointEvents {
  startTime: number;
  forecastEvents: ForecastEvent[];
}
