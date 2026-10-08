import { AirColumnTime } from '../types/sounding';
import { fractionalIndex } from '../utils/interpolation';
import { Unit, convertBetween } from '../utils/units';

export interface SoundingLevel {
  pressure: number;
  height: number;
  temperature: number;
  dewpoint: number;
  humidity: number;
  u: number;
  v: number;
}

export class Sounding {
  private readonly heights: number[];

  private constructor(
    readonly time: number,
    readonly levels: SoundingLevel[],
  ) {
    this.heights = levels.map((level) => level.height);
  }

  static fromAirColumn(column: AirColumnTime): Sounding {
    const levels = column.airLevelDataList
      .map((level) => {
        const windSpeed = convertBetween(level.windStr, Unit.Knots, Unit.MetersPerSecond);
        return {
          pressure: level.pressure,
          height: level.modelHeight,
          temperature: level.temperature,
          dewpoint: level.dewPoint,
          humidity: level.rh,
          u: windSpeed * Math.cos(level.windDir),
          v: windSpeed * Math.sin(level.windDir),
        };
      })
      .sort((a, b) => b.pressure - a.pressure);
    return new Sounding(column.time, levels);
  }

  levelAtHeight(height: number): SoundingLevel | null {
    const index = fractionalIndex(this.heights, height);
    if (index === null) return null;
    const lower = this.levels[Math.floor(index)];
    const upper = this.levels[Math.ceil(index)];
    const fraction = index - Math.floor(index);
    const mix = (from: number, to: number) => from + (to - from) * fraction;
    return {
      pressure: Math.exp(mix(Math.log(lower.pressure), Math.log(upper.pressure))),
      height,
      temperature: mix(lower.temperature, upper.temperature),
      dewpoint: mix(lower.dewpoint, upper.dewpoint),
      humidity: mix(lower.humidity, upper.humidity),
      u: mix(lower.u, upper.u),
      v: mix(lower.v, upper.v),
    };
  }
}
