import { Radar } from '../../engine/looks/radar';
import { Provider } from '../../objects/provider';
import { Quantity, Unit } from '../../utils/units';
import { RadarLayer, RadarLoop } from '../radar/radar-layer';
import { BIRD_HEIGHT_PALETTE } from './filtered-birds-layer';

export class RawBirdRadar extends RadarLayer {
  readonly name = 'מכ"ם ציפורים';
  override readonly timeWindow = { backHours: 24, forwardHours: 0, stepHours: 1 };
  protected readonly loopMinutes = 30;
  protected readonly timesRoute = '/radar/get_time_range_to_bird_radars';
  protected readonly minimumValue = 1;
  protected readonly quantity = Quantity.BirdHeight;
  protected readonly unit = Unit.Meters;
  protected readonly radar = new Radar(
    new Provider((radars: RadarLoop[]) => radars.map((radar) => radar.shown.map)),
    BIRD_HEIGHT_PALETTE,
    this.minimumValue,
    { noise: false },
  );
  readonly looks = [
    {
      look: this.radar,
      name: 'צבעים',
      checked: true,
    },
  ];
}
