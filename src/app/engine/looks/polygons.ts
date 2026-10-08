import { Signal, signal } from '@angular/core';
import type { Layer as DeckLayer } from '@deck.gl/core';
import { IconLayer, PathLayer, SolidPolygonLayer } from '@deck.gl/layers';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { buffer } from '@turf/buffer';
import { centerOfMass } from '@turf/center-of-mass';
import { polygon } from '@turf/helpers';
import polylabel from 'polylabel';
import { Bounds } from '../../types/wrap';
import { Rgba, rgba } from '../../utils/color-scale';
import { Legend, Look, LookKind } from '../base/look';
import { MAP_FONT, OUTLINE_COLOR, inkColor } from '../map-service';
import { LabelIcon, SpriteCache } from '../base/sprite-cache';
import { Provider } from '../../objects/provider';

export enum PolygonPattern {
  Solid = 'solid',
  Horizontal = 'horizontal',
  Vertical = 'vertical',
  Grid = 'grid',
}

export interface PolygonStyle {
  fill: Rgba;
  outline?: Rgba;
  outlineWidth?: number;
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
  color: Rgba;
  width: number;
}

interface PolygonLabel {
  position: [number, number];
  preferredPosition: [number, number];
  coordinates: [number, number][];
  icon: LabelIcon;
  width: number;
  height: number;
}

export class Polygons extends Look<PolygonsView> {
  readonly kind = LookKind.Polygons;
  override readonly legend: Signal<Legend>;
  private readonly sprites = new SpriteCache();
  private readonly patternAxes: Record<PolygonPattern, (0 | 1)[]> = {
    [PolygonPattern.Solid]: [],
    [PolygonPattern.Horizontal]: [1],
    [PolygonPattern.Vertical]: [0],
    [PolygonPattern.Grid]: [1, 0],
  };

  constructor(provider: Provider<PolygonsView>, legend: Legend) {
    super(provider);
    this.legend = signal(legend);
  }

  override release(): void {
    this.sprites.clear();
  }

  deckLayer(id: string, view: PolygonsView): DeckLayer[] {
    const defaultOutline = rgba(inkColor(), 160);
    const [west, south, east, north] = view.frame;
    const frame: [number, number][] = [
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ];
    const innerBorders = view.polygons.flatMap((shape) =>
      this.createInnerBorders(shape.coordinates, 2).map((path): StyledLine => {
        const [r, g, b] = shape.fill;
        return { path, color: [r, g, b, 120], width: 7 };
      }),
    );
    const patterns = view.polygons.flatMap((shape) =>
      this.patternAxes[shape.pattern]
        .flatMap((axis) => this.createLinePattern(shape.coordinates, axis, 0.12))
        .map((path): StyledLine => {
          const [r, g, b, alpha] = shape.fill;
          return { path, color: [r, g, b, Math.min(255, alpha + 70)], width: 5 };
        }),
    );
    const labels = view.polygons
      .filter((shape) => shape.text.length > 0)
      .map((shape): PolygonLabel => {
        const preferred = this.calcLabelPosition(shape.coordinates);
        const icon = this.sprites.spriteOf(`${shape.text.join('\n')}|${shape.fill.join(',')}`, () =>
          this.createLabelIcon(shape),
        );
        return {
          position: [preferred[0], preferred[1]],
          preferredPosition: preferred,
          coordinates: shape.coordinates,
          icon,
          width: icon.width / 2,
          height: icon.height / 2,
        };
      });
    this.spreadLabels(labels, view.zoom, (south + north) / 2);
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
        getColor: (shape) => shape.outline ?? defaultOutline,
        getWidth: (shape) => shape.outlineWidth ?? 1,
        widthUnits: 'pixels',
        updateTriggers: { getColor: defaultOutline },
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
        getSize: (label) => label.height,
      }),
    ];
  }

  private createLabelIcon(shape: StyledPolygon): HTMLCanvasElement {
    const scale = 2;
    const lineHeight = 20 * scale;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    const font = `500 ${17 * scale}px ${MAP_FONT}`;
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
    context.fillStyle = luminance > 150 ? OUTLINE_COLOR : '#ffffff';
    shape.text.forEach((line, index) => {
      context.fillText(line, width / 2, 4 * scale + lineHeight * (index + 0.5));
    });
    return canvas;
  }

  private createLinePattern(
    coordinates: [number, number][],
    axis: 0 | 1,
    spacing: number,
  ): [number, number][][] {
    const across = 1 - axis;
    let min = Infinity;
    let max = -Infinity;
    for (const point of coordinates) {
      if (point[axis] < min) min = point[axis];
      if (point[axis] > max) max = point[axis];
    }
    const lines: [number, number][][] = [];
    for (let level = Math.ceil(min / spacing) * spacing; level < max; level += spacing) {
      const crossings: [number, number][] = [];
      for (let i = 0; i < coordinates.length - 1; i++) {
        const from = coordinates[i];
        const to = coordinates[i + 1];
        if (from[axis] <= level === to[axis] <= level) continue;
        const t = (level - from[axis]) / (to[axis] - from[axis]);
        crossings.push([from[0] + t * (to[0] - from[0]), from[1] + t * (to[1] - from[1])]);
      }
      crossings.sort((p, q) => p[across] - q[across]);
      for (let i = 0; i + 1 < crossings.length; i += 2) {
        lines.push([crossings[i], crossings[i + 1]]);
      }
    }
    return lines;
  }

  private createInnerBorders(
    coordinates: [number, number][],
    insetKm: number,
  ): [number, number][][] {
    const inset = buffer(polygon([coordinates]), -insetKm, { units: 'kilometers' });
    if (!inset) return [];
    const geometry = inset.geometry;
    const shapes = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    return shapes.map((rings) => rings[0] as [number, number][]);
  }

  private calcLabelPosition(coordinates: [number, number][]): [number, number] {
    const shape = polygon([coordinates]);
    const center = centerOfMass(shape).geometry.coordinates as [number, number];
    if (booleanPointInPolygon(center, shape)) return center;
    const pole = polylabel([coordinates], 0.01);
    return [pole[0], pole[1]];
  }

  private spreadLabels(
    labels: PolygonLabel[],
    zoom: number,
    centerLat: number,
  ): void {
    const degreesPerPixel = 360 / (512 * Math.pow(2, zoom));
    const latFactor = Math.cos((centerLat * Math.PI) / 180);
    const half = (label: PolygonLabel): [number, number] => [
      (label.width / 2 + 6) * degreesPerPixel,
      (label.height / 2 + 6) * degreesPerPixel * latFactor,
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
}
