import type { Layer as DeckLayer } from '@deck.gl/core';
import { IconLayer, PathLayer } from '@deck.gl/layers';
import { interpolateRgb } from 'd3-interpolate';
import { Grid } from '../../objects/grid';
import { Provider } from '../../objects/provider';
import { rgba } from '../../utils/color-scale';
import { ContourLine, LevelPicker, contourLines } from '../../utils/contours';
import { Control, color as colorControl } from '../../utils/controls';
import { Look, LookKind } from '../base/look';
import { OUTLINE_COLOR } from '../map-service';
import { SpriteCache } from '../base/sprite-cache';
import { createLabel } from './labels';

interface ContourLabel {
  position: [number, number];
  text: string;
  angle: number;
}

export class Contours extends Look<Grid> {
  readonly kind = LookKind.Contours;
  private readonly sprites = new SpriteCache();

  override readonly controls: Control[];

  constructor(
    provider: Provider<Grid>,
    private pickLevels: LevelPicker,
    private label: (level: number) => string,
    readonly color: string,
  ) {
    super(provider);
    this.controls = [colorControl(color)];
  }

  override release(): void {
    this.sprites.clear();
  }

  deckLayer(id: string, grid: Grid): DeckLayer[] {
    const labelColor = interpolateRgb(this.color, '#ffffff')(0.5);
    const lines = contourLines(grid.data, grid.width, grid.height, grid.bounds, this.levels(grid));
    const labels = this.placeLabels(lines, grid.bounds[2] - grid.bounds[0]);
    return [
      new PathLayer<ContourLine>({
        id: `${id}-outline`,
        data: lines,
        getPath: (line) => line.path,
        getColor: rgba(OUTLINE_COLOR, 200),
        getWidth: 3.5,
        widthUnits: 'pixels',
      }),
      new PathLayer<ContourLine>({
        id: `${id}-lines`,
        data: lines,
        getPath: (line) => line.path,
        getColor: rgba(this.color),
        getWidth: 1.5,
        widthUnits: 'pixels',
      }),
      new IconLayer<ContourLabel>({
        id: `${id}-labels`,
        data: labels,
        getPosition: (label) => label.position,
        getIcon: (label) =>
          this.sprites.spriteOf(label.text, () =>
            createLabel(label.text, 12, 700, labelColor, OUTLINE_COLOR, 4),
          ),
        getAngle: (label) => label.angle,
        getSize: 18,
      }),
    ];
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

  private placeLabels(lines: ContourLine[], viewWidth: number): ContourLabel[] {
    const labels: ContourLabel[] = [];
    for (const { level, path } of lines) {
      let sinceLabel = Infinity;
      let sinceCandidate = 0;
      for (let index = 1; index < path.length; index++) {
        const step = screenDistance(path[index - 1], path[index]);
        sinceLabel += step;
        sinceCandidate += step;
        if (sinceCandidate < 0.05 * viewWidth) continue;
        sinceCandidate = 0;
        const position = path[index];
        const crowded = labels.some(
          (label) => screenDistance(label.position, position) < 0.05 * viewWidth,
        );
        if (sinceLabel < 0.5 * viewWidth || crowded) continue;
        labels.push({ position, text: this.label(level), angle: directionAt(path, index) });
        sinceLabel = 0;
      }
    }
    return labels;
  }
}

const REACH = 14;

function screenDistance(from: [number, number], to: [number, number]): number {
  const stretch = Math.cos((from[1] * Math.PI) / 180);
  return Math.hypot(to[0] - from[0], (to[1] - from[1]) / stretch);
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
