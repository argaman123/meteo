import { featureCollection, point } from '@turf/helpers';
import { isolines } from '@turf/isolines';
import { Bounds } from '../types/wrap';

export type LevelPicker = (min: number, max: number) => number[];

export function levelsEvery(interval: number): LevelPicker {
  return (min, max) => {
    const levels: number[] = [];
    let level = Math.ceil(min / interval) * interval;
    for (; level <= max; level += interval) levels.push(level);
    return levels;
  };
}

export interface ContourLine {
  level: number;
  path: [number, number][];
}

// TODO: UNVERIFIED CODE BELOW

export function contourLines(
  data: Float32Array,
  width: number,
  height: number,
  bounds: Bounds,
  levels: number[],
): ContourLine[] {
  const values = blurred(data, width, height, 2);
  const points = [];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      points.push(point([col, row], { value: values[row * width + col] }));
    }
  }
  const [west, south, east, north] = bounds;
  const toGeo = ([col, row]: number[]): [number, number] => [
    west + (col / (width - 1)) * (east - west),
    north - (row / (height - 1)) * (north - south),
  ];
  return isolines(featureCollection(points), levels, { zProperty: 'value' }).features.flatMap(
    (feature) =>
      feature.geometry.coordinates
        .flatMap((path) => splitAtGaps(path, values, width))
        .map((path) => ({
          level: feature.properties!['value'],
          path: smoothed(path.map(toGeo), 3),
        })),
  );
}

function splitAtGaps(path: number[][], values: Float32Array, width: number): number[][][] {
  const pieces: number[][][] = [[]];
  for (const [col, row] of path) {
    const touchesGap =
      Number.isNaN(values[Math.floor(row) * width + Math.floor(col)]) ||
      Number.isNaN(values[Math.ceil(row) * width + Math.ceil(col)]);
    if (touchesGap) pieces.push([]);
    else pieces[pieces.length - 1].push([col, row]);
  }
  return pieces.filter((piece) => piece.length > 1);
}

export function blurred(values: Float32Array, width: number, height: number, passes: number): Float32Array {
  let current = values;
  for (let pass = 0; pass < passes; pass++) {
    const next = new Float32Array(current.length);
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        if (Number.isNaN(current[row * width + col])) {
          next[row * width + col] = NaN;
          continue;
        }
        let sum = 0;
        let weightSum = 0;
        for (let dRow = -1; dRow <= 1; dRow++) {
          for (let dCol = -1; dCol <= 1; dCol++) {
            const r = row + dRow;
            const c = col + dCol;
            if (r < 0 || c < 0 || r >= height || c >= width) continue;
            const value = current[r * width + c];
            if (Number.isNaN(value)) continue;
            const weight = dRow === 0 && dCol === 0 ? 2 : dRow === 0 || dCol === 0 ? 1 : 0.5;
            sum += value * weight;
            weightSum += weight;
          }
        }
        next[row * width + col] = sum / weightSum;
      }
    }
    current = next;
  }
  return current;
}

function smoothed(path: [number, number][], rounds: number): [number, number][] {
  const first = path[0];
  const last = path[path.length - 1];
  const closed = first[0] === last[0] && first[1] === last[1];
  let points = path;
  for (let round = 0; round < rounds; round++) {
    const result: [number, number][] = closed ? [] : [points[0]];
    for (let i = 0; i < points.length - 1; i++) {
      const [startX, startY] = points[i];
      const [endX, endY] = points[i + 1];
      result.push([0.75 * startX + 0.25 * endX, 0.75 * startY + 0.25 * endY]);
      result.push([0.25 * startX + 0.75 * endX, 0.25 * startY + 0.75 * endY]);
    }
    result.push(closed ? result[0] : points[points.length - 1]);
    points = result;
  }
  return points;
}

export interface Extremum {
  index: number;
  kind: 'maximum' | 'minimum';
}

export function localExtrema(
  data: Float32Array,
  width: number,
  height: number,
  radius: number,
): Extremum[] {
  const extrema: Extremum[] = [];
  for (let row = 2; row < height - 2; row++) {
    for (let col = 2; col < width - 2; col++) {
      const center = row * width + col;
      const value = data[center];
      if (Number.isNaN(value)) continue;
      let isMaximum = true;
      let isMinimum = true;
      for (let r = Math.max(0, row - radius); r <= Math.min(height - 1, row + radius); r++) {
        for (let c = Math.max(0, col - radius); c <= Math.min(width - 1, col + radius); c++) {
          const index = r * width + c;
          if (index === center) continue;
          const neighbor = data[index];
          const before = index < center;
          if (before ? neighbor >= value : neighbor > value) isMaximum = false;
          if (before ? neighbor <= value : neighbor < value) isMinimum = false;
        }
      }
      if (isMaximum) extrema.push({ index: center, kind: 'maximum' });
      if (isMinimum) extrema.push({ index: center, kind: 'minimum' });
    }
  }
  return extrema;
}
