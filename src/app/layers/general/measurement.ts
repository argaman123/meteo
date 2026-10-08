import { Signal, computed, signal } from '@angular/core';
import distance from '@turf/distance';
import { Labels } from '../../engine/looks/labels';
import { Path } from '../../engine/looks/path';
import { Provider } from '../../objects/provider';
import { coordinateFormat } from '../../pages/home/settings-panel/settings-controls';
import { formatDegrees } from '../../utils/geo';
import { Quantity, Unit, format } from '../../utils/units';
import { Inputs, Layer, LookEntry } from '../base/layer';

type Leg = [[number, number], [number, number]];

interface MeasurementData {
  points: [number, number][];
  cursor: [number, number] | null;
}

export class Measurement extends Layer<MeasurementData> {
  readonly name = 'מרחק';
  override readonly timeWindow = null;
  readonly points = signal<[number, number][]>([]);
  readonly looks: LookEntry[] = [
    {
      look: new Path(
        new Provider(({ points, cursor }: MeasurementData) => ({ points, nextPoint: cursor })),
      ),
      name: 'קו',
      checked: true,
    },
    {
      look: new Labels(
        new Provider(({ points }: MeasurementData) => ({
          points: this.legsOf(points).map((leg) => ({
            lon: (leg[0][0] + leg[1][0]) / 2,
            lat: (leg[0][1] + leg[1][1]) / 2,
            text: this.legsText([leg]),
            color: '#ffffff',
          })),
        })),
      ),
      name: 'מרחקים',
      checked: true,
    },
  ];

  hover({ points }: MeasurementData, lon: number, lat: number): string {
    return this.legsText(this.legsOf([...points, [lon, lat]]));
  }

  relevanceOf(): true {
    return true;
  }

  fetch(on: Inputs): Signal<MeasurementData | null> {
    return computed(() => {
      const points = this.points();
      return points.length > 0 ? { points, cursor: on.cursor() } : null;
    });
  }

  private legsOf(points: [number, number][]): Leg[] {
    return points.slice(1).map((end, index): Leg => [points[index], end]);
  }

  private legsText(legs: Leg[]): string {
    const kilometers = legs.reduce(
      (sum, [from, to]) => sum + distance(from, to, { units: 'kilometers' }),
      0,
    );
    const degrees = legs.reduce(
      (sum, [from, to]) => sum + distance(from, to, { units: 'degrees' }),
      0,
    );
    return `${format(kilometers, Quantity.Distance, Unit.Kilometers)} · ${formatDegrees(degrees, coordinateFormat())}`;
  }
}
