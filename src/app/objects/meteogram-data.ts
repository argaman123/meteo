import { MeteogramWrap } from '../types/wrap';
import { bilinearAt, fractionalIndex } from '../utils/interpolation';

export class MeteogramData {
  private constructor(
    readonly times: number[],
    readonly heights: number[],
    readonly data: Float32Array,
  ) {}

  static fromWrap(wrap: MeteogramWrap): MeteogramData {
    const width = wrap.times.length;
    const data = new Float32Array(width * wrap.heights.length);
    wrap.values.forEach((row, r) =>
      row.forEach((value, c) => (data[r * width + c] = value === null ? NaN : value)),
    );
    return new MeteogramData(wrap.times, wrap.heights, data);
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
