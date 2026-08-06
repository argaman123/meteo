import { Bounds } from './wrap';

export interface SatelliteConfiguration {
  satelliteId: string;
  channel: string;
  sector: string;
}

export type SatelliteBoundsMap = Record<string, Record<string, Bounds>>;
