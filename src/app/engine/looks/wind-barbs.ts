import type { Layer as DeckLayer } from '@deck.gl/core';
import { IconLayer } from '@deck.gl/layers';
import { Grid } from '../../objects/grid';
import { Unit, convertBetween } from '../../utils/units';
import { metDirection, windBarbPath } from '../../utils/wind';
import { LabelIcon, Look, LookKind } from '../base/look';
import { basemapBright } from '../map-service';
import { WindField } from './wind-particles';

interface WindBarb {
  position: [number, number];
  knots: number;
  direction: number;
}

export class WindBarbs extends Look<WindField> {
  readonly kind = LookKind.Icons;
  private barbIcons = new Map<string, LabelIcon>();

  override release(): void {
    this.barbIcons.clear();
  }

  deckLayer(id: string, { u, v }: WindField): DeckLayer {
    const bright = basemapBright();
    const [west, south, east, north] = u.bounds;
    const cellWidth = (east - west) / (u.width - 1);
    const cellHeight = (north - south) / (u.height - 1) / Math.cos((((north + south) / 2) * Math.PI) / 180);
    return new IconLayer<WindBarb>({
      id,
      data: this.barbs(u, v),
      getPosition: (barb) => barb.position,
      getIcon: (barb) => this.icon(barb.knots, barb.position[1] < 0, bright),
      getAngle: (barb) => -barb.direction,
      getSize: ((2 * Math.min(cellWidth, cellHeight)) / 360) * 512 * 1.1,
      sizeUnits: 'common',
      updateTriggers: { getIcon: bright },
    });
  }

  private barbs(u: Grid, v: Grid): WindBarb[] {
    const [west, south, east, north] = u.bounds;
    const barbs: WindBarb[] = [];
    for (let row = 0; row < u.height; row += 2) {
      for (let column = 0; column < u.width; column += 2) {
        const eastward = u.data[row * u.width + column];
        const northward = v.data[row * u.width + column];
        if (Number.isNaN(eastward) || Number.isNaN(northward)) continue;
        barbs.push({
          position: [
            west + (column / (u.width - 1)) * (east - west),
            north - (row / (u.height - 1)) * (north - south),
          ],
          knots: Math.round(convertBetween(Math.hypot(eastward, northward), Unit.MetersPerSecond, Unit.Knots) / 5) * 5,
          direction: metDirection(eastward, northward),
        });
      }
    }
    return barbs;
  }

  private icon(knots: number, southern: boolean, bright: boolean): LabelIcon {
    const key = `${knots} ${southern} ${bright}`;
    const cached = this.barbIcons.get(key);
    if (cached) return cached;
    const size = 128;
    const scale = size / 26;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d')!;
    context.translate(size / 2, size / 2);
    context.scale(southern ? -scale : scale, scale);
    const ink = bright ? '#212429' : '#ffffff';
    context.fillStyle = ink;
    context.strokeStyle = ink;
    if (knots < 5) {
      context.arc(0, 0, 1.25, 0, 2 * Math.PI);
      context.fill();
    } else {
      context.translate(0, 10);
      const path = new Path2D(windBarbPath(knots));
      context.lineWidth = 1.25;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.fill(path, 'evenodd');
      context.stroke(path);
    }
    const icon = {
      url: canvas.toDataURL(),
      width: size,
      height: size,
      anchorX: size / 2,
      anchorY: size / 2,
    };
    this.barbIcons.set(key, icon);
    return icon;
  }
}
