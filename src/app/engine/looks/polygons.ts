import { Signal, signal } from '@angular/core';
import type { Color, Layer as DeckLayer } from '@deck.gl/core';
import { IconLayer, PathLayer, SolidPolygonLayer } from '@deck.gl/layers';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { buffer } from '@turf/buffer';
import { centerOfMass } from '@turf/center-of-mass';
import { polygon } from '@turf/helpers';
import polylabel from 'polylabel';
import { Bounds } from '../../types/wrap';
import { rgba } from '../../utils/color-scale';
import { LabelIcon, Legend, Look, LookKind } from '../base/look';
import { Provider } from '../../objects/provider';

export enum PolygonPattern {
  Solid = 'solid',
  Horizontal = 'horizontal',
  Vertical = 'vertical',
  Grid = 'grid',
}

export interface PolygonStyle {
  fill: Color;
  outline: Color;
  outlineWidth: number;
  pattern: PolygonPattern;
  text: string[];
}

export interface StyledPolygon extends PolygonStyle {
  coordinates: [number, number][];
}

export interface PolygonsView {
  frame: Bounds;
  polygons: StyledPolygon[];
  zoom: number;
}

interface StyledLine {
  path: [number, number][];
  color: Color;
  width: number;
}

interface PolygonLabel {
  position: [number, number];
  preferredPosition: [number, number];
  coordinates: [number, number][];
  icon: LabelIcon;
}

export class Polygons extends Look<PolygonsView> {
  readonly kind = LookKind.Polygons;
  override readonly legend: Signal<Legend>;
  private labelIcons = new Map<string, LabelIcon>();

  constructor(provider: Provider<PolygonsView>, legend: Legend) {
    super(provider);
    this.legend = signal(legend);
  }

  override release(): void {
    this.labelIcons.clear();
  }

  deckLayer(id: string, view: PolygonsView): DeckLayer[] {
    const [west, south, east, north] = view.frame;
    const frame: [number, number][] = [
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ];
    const innerBorders = view.polygons.flatMap((shape) =>
      createInnerBorders(shape.coordinates).map((path): StyledLine => {
        const [r, g, b] = shape.fill;
        return { path, color: [r, g, b, 120], width: 7 };
      }),
    );
    const patterns = view.polygons.flatMap((shape) =>
      createLinePattern(shape).map((path): StyledLine => {
        const [r, g, b, alpha] = shape.fill;
        return {
          path,
          color: [r, g, b, Math.min(255, (alpha ?? 255) + 70)],
          width: 5,
        };
      }),
    );
    const labels = view.polygons
      .filter((shape) => shape.text.length > 0)
      .map((shape): PolygonLabel => {
        const preferred = calcLabelPosition(shape.coordinates);
        return {
          position: [preferred[0], preferred[1]],
          preferredPosition: preferred,
          coordinates: shape.coordinates,
          icon: this.createLabelIcon(shape),
        };
      });
    spreadLabels(labels, view.zoom, (south + north) / 2);
    return [
      new SolidPolygonLayer<StyledPolygon>({
        id: `${id}-areas`,
        data: view.polygons,
        getPolygon: (shape) => shape.coordinates,
        getFillColor: (shape) => shape.fill,
      }),
      new PathLayer<StyledLine>({
        id: `${id}-patterns`,
        data: patterns,
        getPath: (line) => line.path,
        getColor: (line) => line.color,
        getWidth: (line) => line.width,
        widthUnits: 'pixels',
      }),
      new PathLayer<[number, number][]>({
        id: `${id}-frame`,
        data: [frame],
        getPath: (path) => path,
        getColor: rgba('#94a3b8', 180),
        getWidth: 1.5,
        widthUnits: 'pixels',
      }),
      new PathLayer<StyledPolygon>({
        id: `${id}-outlines`,
        data: view.polygons,
        getPath: (shape) => shape.coordinates,
        getColor: (shape) => shape.outline,
        getWidth: (shape) => shape.outlineWidth,
        widthUnits: 'pixels',
      }),
      new PathLayer<StyledLine>({
        id: `${id}-inner-borders`,
        data: innerBorders,
        getPath: (line) => line.path,
        getColor: (line) => line.color,
        getWidth: (line) => line.width,
        widthUnits: 'pixels',
      }),
      new IconLayer<PolygonLabel>({
        id: `${id}-texts`,
        data: labels,
        getPosition: (label) => label.position,
        getIcon: (label) => label.icon,
        getSize: (label) => label.icon.height / 2,
      }),
    ];
  }

  private createLabelIcon(shape: StyledPolygon): LabelIcon {
    const key = `${shape.text.join('\n')}|${shape.fill.join(',')}`;
    const cached = this.labelIcons.get(key);
    if (cached) return cached;
    const scale = 2;
    const lineHeight = 20 * scale;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    const font = `500 ${17 * scale}px 'Heebo Variable', sans-serif`;
    context.font = font;
    const width = Math.ceil(
      Math.max(...shape.text.map((line) => context.measureText(line).width)) + 14 * scale,
    );
    const height = lineHeight * shape.text.length + 8 * scale;
    canvas.width = width;
    canvas.height = height;
    context.font = font;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineJoin = 'round';
    const [fillR, fillG, fillB] = shape.fill;
    context.beginPath();
    context.roundRect(0, 0, width, height, 8 * scale);
    context.fillStyle = `rgb(${fillR} ${fillG} ${fillB} / 92%)`;
    context.fill();
    const luminance = 0.299 * fillR + 0.587 * fillG + 0.114 * fillB;
    context.fillStyle = luminance > 150 ? '#0f172a' : '#ffffff';
    shape.text.forEach((line, index) => {
      context.fillText(line, width / 2, 4 * scale + lineHeight * (index + 0.5));
    });
    const icon = { url: canvas.toDataURL(), width, height, anchorX: width / 2, anchorY: height / 2 };
    this.labelIcons.set(key, icon);
    return icon;
  }
}

function createLinePattern(shape: StyledPolygon, spacing = 0.12): [number, number][][] {
  if (shape.pattern === PolygonPattern.Solid) return [];
  const directions =
    shape.pattern === PolygonPattern.Grid
      ? [PolygonPattern.Horizontal, PolygonPattern.Vertical]
      : [shape.pattern];
  const lines: [number, number][][] = [];
  for (const direction of directions) {
    const value =
      direction === PolygonPattern.Horizontal
        ? (point: [number, number]) => point[1]
        : (point: [number, number]) => point[0];
    const sortAxis = direction === PolygonPattern.Vertical ? 1 : 0;
    let min = Infinity;
    let max = -Infinity;
    for (const point of shape.coordinates) {
      const v = value(point);
      if (v < min) min = v;
      if (v > max) max = v;
    }
    for (let level = Math.ceil(min / spacing) * spacing; level < max; level += spacing) {
      const crossings: [number, number][] = [];
      for (let i = 0; i < shape.coordinates.length - 1; i++) {
        const from = shape.coordinates[i];
        const to = shape.coordinates[i + 1];
        const start = value(from);
        const end = value(to);
        if (start <= level === end <= level) continue;
        const t = (level - start) / (end - start);
        crossings.push([from[0] + t * (to[0] - from[0]), from[1] + t * (to[1] - from[1])]);
      }
      crossings.sort((p, q) => p[sortAxis] - q[sortAxis]);
      for (let i = 0; i + 1 < crossings.length; i += 2) {
        lines.push([crossings[i], crossings[i + 1]]);
      }
    }
  }
  return lines;
}

function createInnerBorders(coordinates: [number, number][]): [number, number][][] {
  const inset = buffer(polygon([coordinates]), -2, { units: 'kilometers' });
  if (!inset) return [];
  const geometry = inset.geometry;
  const shapes = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return shapes.map((rings) => rings[0] as [number, number][]);
}

function calcLabelPosition(coordinates: [number, number][]): [number, number] {
  const shape = polygon([coordinates]);
  const center = centerOfMass(shape).geometry.coordinates as [number, number];
  if (booleanPointInPolygon(center, shape)) return center;
  const pole = polylabel([coordinates], 0.01);
  return [pole[0], pole[1]];
}

function spreadLabels(labels: PolygonLabel[], zoom: number, centerLat: number): void {
  const degreesPerPixel = 360 / (512 * Math.pow(2, zoom));
  const latFactor = Math.cos((centerLat * Math.PI) / 180);
  const half = (label: PolygonLabel): [number, number] => [
    (label.icon.width / 4 + 6) * degreesPerPixel,
    (label.icon.height / 4 + 6) * degreesPerPixel * latFactor,
  ];
  for (let pass = 0; pass < 40; pass++) {
    let moved = false;
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i];
        const b = labels[j];
        const [aw, ah] = half(a);
        const [bw, bh] = half(b);
        const dx = b.position[0] - a.position[0];
        const dy = b.position[1] - a.position[1];
        const gapX = aw + bw - Math.abs(dx);
        const gapY = ah + bh - Math.abs(dy);
        if (gapX <= 0 || gapY <= 0) continue;
        moved = true;
        if (gapY <= gapX) {
          const sign = dy !== 0 ? Math.sign(dy) : i % 2 === 0 ? 1 : -1;
          a.position[1] -= (sign * gapY) / 2;
          b.position[1] += (sign * gapY) / 2;
        } else {
          const sign = dx !== 0 ? Math.sign(dx) : i % 2 === 0 ? 1 : -1;
          a.position[0] -= (sign * gapX) / 2;
          b.position[0] += (sign * gapX) / 2;
        }
      }
    }
    for (const label of labels) {
      if (!booleanPointInPolygon(label.position, polygon([label.coordinates]))) {
        label.position = [label.preferredPosition[0], label.preferredPosition[1]];
      }
    }
    if (!moved) return;
  }
}
