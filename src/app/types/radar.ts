export interface RadarEntity {
  time: number;
  fileName: string;
  radarName: string;
  radarType: string;
  fileVersion: number;
}

export type RadarTimeRange = Record<string, RadarEntity[]>;
