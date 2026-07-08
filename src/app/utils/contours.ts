import { Grid } from '../objects/grid';
import { Bounds } from '../types/wrap';

export interface ContourLine {
  level: number;
  path: [number, number][];
}

// TODO: UNVERIFIED CODE BELOW

export function contourLines(grid: Grid, levels: number[]): ContourLine[] {
  const field = blurred(grid.data, grid.width, grid.height, 2);
  const lattice = upsample(field, grid.width, grid.height, grid.bounds, 3);
  const lines: ContourLine[] = [];
  for (const level of levels) {
    for (const path of trace(lattice, level)) lines.push({ level, path: smoothed(path, 2) });
  }
  return lines;
}

function blurred(values: Float32Array, width: number, height: number, passes: number): Float32Array {
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

interface Lattice {
  width: number;
  height: number;
  values: Float32Array;
  west: number;
  south: number;
  east: number;
  north: number;
}

function upsample(
  field: Float32Array,
  coarseWidth: number,
  coarseHeight: number,
  bounds: Bounds,
  factor: number,
): Lattice {
  const width = (coarseWidth - 1) * factor + 1;
  const height = (coarseHeight - 1) * factor + 1;
  const [west, south, east, north] = bounds;
  const values = new Float32Array(width * height);
  for (let row = 0; row < height; row++) {
    const y = row / factor;
    const r0 = Math.min(Math.floor(y), coarseHeight - 2);
    const fr = y - r0;
    for (let col = 0; col < width; col++) {
      const x = col / factor;
      const c0 = Math.min(Math.floor(x), coarseWidth - 2);
      const fc = x - c0;
      values[row * width + col] =
        field[r0 * coarseWidth + c0] * (1 - fr) * (1 - fc) +
        field[r0 * coarseWidth + c0 + 1] * (1 - fr) * fc +
        field[(r0 + 1) * coarseWidth + c0] * fr * (1 - fc) +
        field[(r0 + 1) * coarseWidth + c0 + 1] * fr * fc;
    }
  }
  return { width, height, values, west, south, east, north };
}

function trace(lattice: Lattice, level: number): [number, number][][] {
  const { width, height, values } = lattice;
  const segments: [number, number][] = [];
  const touching = new Map<number, number[]>();

  const addSegment = (edgeA: number, edgeB: number): void => {
    const index = segments.length;
    segments.push([edgeA, edgeB]);
    for (const edge of [edgeA, edgeB]) {
      const list = touching.get(edge);
      if (list) list.push(index);
      else touching.set(edge, [index]);
    }
  };

  for (let row = 0; row < height - 1; row++) {
    for (let col = 0; col < width - 1; col++) {
      const topLeft = values[row * width + col];
      const topRight = values[row * width + col + 1];
      const bottomLeft = values[(row + 1) * width + col];
      const bottomRight = values[(row + 1) * width + col + 1];
      if (
        Number.isNaN(topLeft) ||
        Number.isNaN(topRight) ||
        Number.isNaN(bottomLeft) ||
        Number.isNaN(bottomRight)
      ) {
        continue;
      }
      const caseIndex =
        (topLeft >= level ? 8 : 0) |
        (topRight >= level ? 4 : 0) |
        (bottomRight >= level ? 2 : 0) |
        (bottomLeft >= level ? 1 : 0);
      if (caseIndex === 0 || caseIndex === 15) continue;
      const top = (row * width + col) * 2;
      const bottom = ((row + 1) * width + col) * 2;
      const left = (row * width + col) * 2 + 1;
      const right = (row * width + col + 1) * 2 + 1;
      if (caseIndex === 5 || caseIndex === 10) {
        const centerHigh = (topLeft + topRight + bottomLeft + bottomRight) / 4 >= level;
        const cornersAlone = caseIndex === 5 ? centerHigh : !centerHigh;
        if (cornersAlone) {
          addSegment(top, left);
          addSegment(bottom, right);
        } else {
          addSegment(top, right);
          addSegment(left, bottom);
        }
      } else if (caseIndex === 1 || caseIndex === 14) addSegment(left, bottom);
      else if (caseIndex === 2 || caseIndex === 13) addSegment(bottom, right);
      else if (caseIndex === 3 || caseIndex === 12) addSegment(left, right);
      else if (caseIndex === 4 || caseIndex === 11) addSegment(top, right);
      else if (caseIndex === 6 || caseIndex === 9) addSegment(top, bottom);
      else addSegment(top, left);
    }
  }

  const pointOn = (edge: number): [number, number] => {
    const cell = edge >> 1;
    const row = Math.floor(cell / width);
    const col = cell % width;
    const start = values[row * width + col];
    const end = edge & 1 ? values[(row + 1) * width + col] : values[row * width + col + 1];
    const along = (level - start) / (end - start);
    const x = edge & 1 ? col : col + along;
    const y = edge & 1 ? row + along : row;
    return [
      lattice.west + ((lattice.east - lattice.west) * x) / (width - 1),
      lattice.north - ((lattice.north - lattice.south) * y) / (height - 1),
    ];
  };

  const visited = new Array<boolean>(segments.length).fill(false);
  const lines: [number, number][][] = [];

  const walk = (startEdge: number): [number, number][] => {
    const path: [number, number][] = [pointOn(startEdge)];
    let edge = startEdge;
    for (;;) {
      const next = touching.get(edge)?.find((index) => !visited[index]);
      if (next === undefined) return path;
      visited[next] = true;
      const [edgeA, edgeB] = segments[next];
      edge = edge === edgeA ? edgeB : edgeA;
      path.push(pointOn(edge));
    }
  };

  for (const [edge, indices] of touching) {
    if (indices.length === 1 && !visited[indices[0]]) lines.push(walk(edge));
  }
  for (let index = 0; index < segments.length; index++) {
    if (!visited[index]) lines.push(walk(segments[index][0]));
  }
  return lines;
}
