import { SoundingLevel, SoundingWrap } from '../types/sounding';
import { fractionalIndex } from '../utils/interpolation';

export class Sounding {
  private readonly heights: number[];

  private constructor(
    readonly time: number,
    readonly levels: SoundingLevel[],
  ) {
    this.heights = levels.map((level) => level.height);
  }

  static fromWrap(wrap: SoundingWrap): Sounding {
    return new Sounding(
      wrap.time,
      [...wrap.levels].sort((a, b) => b.pressure - a.pressure),
    );
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
      u: mix(lower.u, upper.u),
      v: mix(lower.v, upper.v),
    };
  }
}
