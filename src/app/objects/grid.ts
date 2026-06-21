import { Bounds, Wrap } from '../types/wrap';

export class Grid {
  readonly info: {
    baseTime: number;
    forecastTime: number;
    model: string;
    param: string;
    pressure: string | null;
    heightFt: string | null;
  };
  readonly bounds: Bounds;
  readonly width: number;
  readonly height: number;
  readonly data: Float32Array;

  constructor(wrap: Wrap) {
    const height = wrap.values.length;
    const width = height > 0 ? wrap.values[0].length : 0;
    const data = new Float32Array(width * height);
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const value = wrap.values[r][c];
        data[r * width + c] = value === null ? NaN : value;
      }
    }
    this.info = {
      baseTime: wrap.wrap_info.base_time,
      forecastTime: wrap.wrap_info.forecast_time,
      model: wrap.wrap_info.model,
      param: wrap.wrap_info.param,
      pressure: wrap.wrap_info.pressure,
      heightFt: wrap.wrap_info.height,
    };
    this.bounds = [
      wrap.start_x,
      wrap.start_y + wrap.ry * (height - 1),
      wrap.start_x + wrap.rx * (width - 1),
      wrap.start_y,
    ];
    this.width = width;
    this.height = height;
    this.data = data;
  }

  valueAt(lon: number, lat: number, interpolation: 'bilinear' | 'nearest'): number {
    const [west, south, east, north] = this.bounds;
    const col = ((lon - west) / (east - west)) * (this.width - 1);
    const row = ((north - lat) / (north - south)) * (this.height - 1);
    if (col < 0 || row < 0 || col > this.width - 1 || row > this.height - 1) return NaN;
    return interpolation === 'nearest' ? this.nearest(col, row) : this.bilinear(col, row);
  }

  private nearest(col: number, row: number): number {
    return this.data[Math.round(row) * this.width + Math.round(col)];
  }

  private bilinear(col: number, row: number): number {
    if (Number.isNaN(this.data[Math.round(row) * this.width + Math.round(col)])) return NaN;
    const c0 = Math.floor(col);
    const r0 = Math.floor(row);
    const c1 = Math.min(c0 + 1, this.width - 1);
    const r1 = Math.min(r0 + 1, this.height - 1);
    const fc = col - c0;
    const fr = row - r0;
    const corners = [
      this.data[r0 * this.width + c0],
      this.data[r0 * this.width + c1],
      this.data[r1 * this.width + c0],
      this.data[r1 * this.width + c1],
    ];
    const weights = [(1 - fc) * (1 - fr), fc * (1 - fr), (1 - fc) * fr, fc * fr];
    let sum = 0;
    let weightSum = 0;
    for (let i = 0; i < 4; i++) {
      if (Number.isNaN(corners[i])) continue;
      sum += corners[i] * weights[i];
      weightSum += weights[i];
    }
    return weightSum > 0 ? sum / weightSum : NaN;
  }
}
