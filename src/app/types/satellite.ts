export enum SatelliteChannel {
  IR10_8 = 'IR10.8',
  FLC = 'FLC',
}

export interface LimitedSatConf {
  channel: string;
  startDateTime: number;
  endDateTime: number;
  startHour: number;
  endHour: number;
  satellite: number;
}

export interface SatImage {
  imgTime: number;
  satelliteType: string;
  satelliteId: string;
  satelliteSector: string;
  satelliteSource: string;
  fileName: string;
  channel_number: number;
  current_channel: number;
}

export interface SectorCoords {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface SatelliteSectorEntry {
  date: string;
  coords: SectorCoords;
}

export type SatelliteSector = 'modeq' | 'noaeq' | 'naseq' | 'srneq';

export type SatelliteSectors = { id: string } & Partial<
  Record<SatelliteSector, SatelliteSectorEntry[]>
>;
