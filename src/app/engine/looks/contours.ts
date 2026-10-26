import { interpolateRgb } from 'd3-interpolate';
import { Grid } from '../../objects/grid';
import { Provider } from '../../objects/provider';
import { rgba } from '../../utils/color-scale';
import { ContourLine, LevelPicker } from '../../utils/contours';
import { Control, color as colorControl } from '../../utils/controls';
import { BackgroundResult, traceContoursInBackground } from '../base/background';
import { Look, LookKind } from '../base/look';
import { IconOverlay, IconScaling, LineOverlay, Overlay } from '../base/overlay';
import { OUTLINE_COLOR } from '../map-service';
import { createLabel } from './labels';

interface ContourLabel {
  position: [number, number];
  text: string;
  angle: number;
}

export class Contours extends Look<Grid> {
  readonly kind = LookKind.Contours;

  override readonly controls: Control[];
  private readonly lines = new BackgroundResult((grid: Grid) =>
    traceContoursInBackground(grid, this.levels(grid)),
  );

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
    this.lines.clear();
  }

  buildLook(grid: Grid): Overlay[] {
    const traced = this.lines.requestResult(grid);
    if (!traced) return [];
    const labelColor = interpolateRgb(this.color, '#ffffff')(0.5);
    const lines = traced.output;
    const [west, , east] = traced.input.bounds;
    const labels = this.placeLabels(lines, east - west);
    return [
      new LineOverlay(lines.map((line) => ({ path: line.path, color: rgba(OUTLINE_COLOR, 200), width: 3.5 }))),
      new LineOverlay(lines.map((line) => ({ path: line.path, color: rgba(this.color), width: 1.5 }))),
      new IconOverlay(
        labels.map((label) => ({
          position: label.position,
          sprite: {
            key: `${label.text} ${labelColor}`,
            create: () => createLabel(label.text, 12, 700, labelColor, OUTLINE_COLOR, 4),
          },
          size: 18,
          angle: -label.angle,
          opacity: 1,
        })),
        IconScaling.Pixels,
      ),
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
