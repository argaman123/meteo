import { Bounds, Wrap } from '../types/wrap';
import { bilinearAt } from '../utils/interpolation';

export class Grid<I = unknown> {
  private constructor(
    readonly info: I,
    readonly bounds: Bounds,
    readonly width: number,
    readonly height: number,
    readonly data: Float32Array,
  ) {}

  static fromWrap<I>(wrap: Wrap<I>): Grid<I> {
    const height = wrap.values.length;
    const width = height > 0 ? wrap.values[0].length : 0;
    const southFirst = wrap.ry > 0;
    const data = new Float32Array(width * height);
    for (let r = 0; r < height; r++) {
      const sourceRow = wrap.values[southFirst ? height - 1 - r : r];
      for (let c = 0; c < width; c++) {
        const value = sourceRow[c];
        data[r * width + c] = value === null ? NaN : value;
      }
    }
    const lastRowLat = wrap.start_y + wrap.ry * (height - 1);
    const bounds: Bounds = [
      wrap.start_x,
      Math.min(wrap.start_y, lastRowLat),
      wrap.start_x + wrap.rx * (width - 1),
      Math.max(wrap.start_y, lastRowLat),
    ];
    return new Grid(wrap.wrap_info, bounds, width, height, data);
  }

  static combine<I>(grids: Grid<I>[], fn: (...values: number[]) => number): Grid<I> {
    const base = grids[0];
    const data = new Float32Array(base.width * base.height);
    for (let i = 0; i < data.length; i++) {
      const values = grids.map((grid) => grid.data[i]);
      data[i] = values.some((value) => Number.isNaN(value)) ? NaN : fn(...values);
    }
    return new Grid(base.info, base.bounds, base.width, base.height, data);
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
    return bilinearAt(this.data, this.width, this.height, col, row);
  }
}
