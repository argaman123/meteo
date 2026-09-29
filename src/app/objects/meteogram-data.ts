import { AirColumnTime, AirLevelData } from '../types/sounding';
import { bilinearAt, fractionalIndex } from '../utils/interpolation';
import { Unit, convertBetween } from '../utils/units';

export class MeteogramData {
  private constructor(
    readonly times: number[],
    readonly heights: number[],
    readonly data: Float32Array,
  ) {}

  static fromAirColumns(
    columns: AirColumnTime[],
    heightsFt: number[],
    valueOf: (level: AirLevelData) => number,
  ): MeteogramData {
    const sorted = [...columns].sort((a, b) => a.time - b.time);
    const times = sorted.map((column) => column.time);
    const data = new Float32Array(times.length * heightsFt.length).fill(NaN);
    sorted.forEach((column, col) => {
      const levels = [...column.airLevelDataList].sort((a, b) => a.modelHeight - b.modelHeight);
      const levelFeet = levels.map((level) => convertBetween(level.modelHeight, Unit.Meters, Unit.Feet));
      heightsFt.forEach((heightFt, row) => {
        const index = fractionalIndex(levelFeet, heightFt);
        if (index === null) return;
        const lower = valueOf(levels[Math.floor(index)]);
        const upper = valueOf(levels[Math.ceil(index)]);
        data[row * times.length + col] = lower + (upper - lower) * (index - Math.floor(index));
      });
    });
    return new MeteogramData(times, heightsFt, data);
  }

  static combine(parts: MeteogramData[], fn: (...values: number[]) => number): MeteogramData {
    const base = parts[0];
    const data = new Float32Array(base.data.length);
    for (let i = 0; i < data.length; i++) {
      const values = parts.map((part) => part.data[i]);
      data[i] = values.some((value) => Number.isNaN(value)) ? NaN : fn(...values);
    }
    return new MeteogramData(base.times, base.heights, data);
  }

  valueAt(time: number, heightFt: number): number {
    const col = this.timeIndex(time);
    const row = this.heightIndex(heightFt);
    return col === null || row === null ? NaN : this.valueAtIndex(col, row);
  }

  timeIndex(time: number): number | null {
    return fractionalIndex(this.times, time);
  }

  heightIndex(heightFt: number): number | null {
    return fractionalIndex(this.heights, heightFt);
  }

  valueAtIndex(col: number, row: number): number {
    return bilinearAt(this.data, this.times.length, this.heights.length, col, row);
  }
}
