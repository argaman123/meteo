import type { Layer as DeckLayer } from '@deck.gl/core';
import { IconLayer, PathLayer } from '@deck.gl/layers';
import { rgb } from 'd3-color';
import { Grid } from '../../objects/grid';
import { Provider } from '../../objects/provider';
import { ContourLine, contourLines } from '../../utils/contours';
import { Look, LookKind } from '../base/look';

interface ContourLabel {
  position: [number, number];
  text: string;
  angle: number;
}

interface LabelIcon {
  url: string;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

export type LevelPicker = (min: number, max: number) => number[];

export function levelsEvery(interval: number): LevelPicker {
  return (min, max) => {
    const levels: number[] = [];
    let level = Math.ceil(min / interval) * interval;
    for (; level <= max; level += interval) levels.push(level);
    return levels;
  };
}

export class Contours extends Look<Grid> {
  readonly kind = LookKind.Contours;
  private iconsCache = new Map<string, LabelIcon>();

  constructor(
    provider: Provider<Grid>,
    private pickLevels: LevelPicker,
    private label: (level: number) => string,
    readonly color: string,
  ) {
    super(provider);
  }

  deckLayer(id: string, grid: Grid): DeckLayer[] {
    const line = rgb(this.color);
    const lines = contourLines(grid, this.levels(grid));
    const labels: ContourLabel[] = [];
    for (const { level, path } of lines) {
      const text = this.label(level);
      for (const anchor of this.anchors(path)) {
        labels.push({ position: path[anchor], text, angle: directionAt(path, anchor) });
      }
    }
    return [
      new PathLayer<ContourLine>({
        id: `${id}-casing`,
        data: lines,
        getPath: (line) => line.path,
        getColor: [15, 23, 42, 140],
        getWidth: 4,
        widthUnits: 'pixels',
      }),
      new PathLayer<ContourLine>({
        id: `${id}-lines`,
        data: lines,
        getPath: (line) => line.path,
        getColor: [line.r, line.g, line.b, 230],
        getWidth: 2,
        widthUnits: 'pixels',
      }),
      new IconLayer<ContourLabel>({
        id: `${id}-labels`,
        data: labels,
        getPosition: (label) => label.position,
        getIcon: (label) => this.icon(label.text),
        getAngle: (label) => label.angle,
        getSize: 16,
      }),
    ];
  }

  private icon(text: string): LabelIcon {
    const cached = this.iconsCache.get(text);
    if (cached) return cached;
    const scale = 2;
    const height = 16 * scale;
    const canvas = document.createElement('canvas');
    canvas.height = height;
    const context = canvas.getContext('2d')!;
    const font = `400 ${11 * scale}px 'Heebo Variable', sans-serif`;
    context.font = font;
    const width = Math.ceil(context.measureText(text).width + 12 * scale);
    canvas.width = width;
    context.font = font;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const pill = rgb(this.color);
    context.fillStyle = `rgb(${pill.r} ${pill.g} ${pill.b} / 92%)`;
    context.beginPath();
    context.roundRect(scale / 2, scale / 2, width - scale, height - scale, (height - scale) / 2);
    context.fill();
    context.strokeStyle = 'rgb(15 23 42 / 55%)';
    context.lineWidth = scale;
    context.stroke();
    const luminance = 0.299 * pill.r + 0.587 * pill.g + 0.114 * pill.b;
    context.fillStyle = luminance > 150 ? '#0f172a' : '#ffffff';
    context.fillText(text, width / 2, height / 2 + scale * 0.5);
    const icon = {
      url: canvas.toDataURL(),
      width,
      height,
      anchorX: width / 2,
      anchorY: height / 2,
    };
    this.iconsCache.set(text, icon);
    return icon;
  }

  private levels(grid: Grid): number[] {
    let min = Infinity;
    let max = -Infinity;
    for (const value of grid.data) {
      if (Number.isNaN(value)) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }
    return min > max ? [] : this.pickLevels(min, max);
  }

  // TODO: UNVERIFIED CODE BELOW

  private anchors(path: [number, number][]): number[] {
    if (path.length < 120) return [];
    const count = Math.max(1, Math.round(path.length / 1000));
    const anchors: number[] = [];
    for (let slot = 0; slot < count; slot++) {
      const start = Math.floor((slot * path.length) / count);
      const end = Math.floor(((slot + 1) * path.length) / count);
      anchors.push(bestAnchorIn(path, start, end));
    }
    return anchors;
  }
}

const REACH = 14;

function bestAnchorIn(path: [number, number][], start: number, end: number): number {
  const lo = Math.max(REACH, start);
  const hi = Math.min(path.length - 1 - REACH, end);
  const middle = Math.floor((start + end) / 2);
  let best = Math.min(Math.max(middle, REACH), path.length - 1 - REACH);
  let bestScore = Infinity;
  for (let index = lo; index <= hi; index += 4) {
    const tilt = Math.abs(directionAt(path, index));
    const bend = (bendAt(path, index) * 180) / Math.PI;
    const score = 1.5 * tilt + bend;
    if (score < bestScore) {
      bestScore = score;
      best = index;
    }
  }
  return best;
}

function bendAt(path: [number, number][], index: number): number {
  const before = path[index - REACH];
  const at = path[index];
  const after = path[index + REACH];
  const inbound = Math.atan2(at[1] - before[1], at[0] - before[0]);
  const outbound = Math.atan2(after[1] - at[1], after[0] - at[0]);
  let difference = Math.abs(outbound - inbound);
  if (difference > Math.PI) difference = 2 * Math.PI - difference;
  return difference;
}

function directionAt(path: [number, number][], index: number): number {
  const from = path[Math.max(0, index - REACH)];
  const to = path[Math.min(path.length - 1, index + REACH)];
  const stretch = Math.cos((path[index][1] * Math.PI) / 180);
  let angle = (Math.atan2((to[1] - from[1]) / stretch, to[0] - from[0]) * 180) / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  return angle;
}
