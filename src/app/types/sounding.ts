export interface SoundingLevel {
  pressure: number;
  height: number;
  temperature: number;
  dewpoint: number;
  u: number;
  v: number;
}

export interface SoundingWrap {
  time: number;
  levels: SoundingLevel[];
}
