import { Radar } from '../../engine/looks/radar';
import { Provider } from '../../objects/provider';
import { Quantity, Unit, format } from '../../utils/units';
import { RadarLayer, RadarLoop } from '../radar/radar-layer';
import { BIRD_HEIGHT_PALETTE } from './filtered-birds-layer';

export class RawBirdRadar extends RadarLayer {
  readonly name = 'מכ"ם ציפורים';
  override readonly timeWindow = { backHours: 24, forwardHours: 0, stepHours: 1 };
  protected readonly loopMinutes = 30;
  protected readonly timesRoute = '/radar/get_time_range_to_bird_radars';
  private readonly minimumHeight = 1;
  readonly looks = [
    {
      look: new Radar(
        new Provider((radars: RadarLoop[]) => radars.map((radar) => radar.shown.map)),
        BIRD_HEIGHT_PALETTE,
        this.minimumHeight,
        { noise: false },
      ),
      name: 'צבעים',
      checked: true,
    },
  ];

  hover(radars: RadarLoop[], lon: number, lat: number): string {
    const values = radars
      .map((radar) => radar.shown.map.valueAt(lon, lat, 'nearest'))
      .filter((value) => !Number.isNaN(value));
    const most = Math.max(...values);
    if (most < this.minimumHeight) return '—';
    return format(most, Quantity.BirdHeight, Unit.Meters);
  }
}
