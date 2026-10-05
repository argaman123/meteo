import { Radar } from '../../engine/looks/radar';
import { Provider } from '../../objects/provider';
import { Quantity, Unit, format } from '../../utils/units';
import { RadarLayer, RadarLoop } from './radar-layer';

const RAIN_PALETTE = [
  { value: 0.1, color: '#60a5fa', label: 'גשם קל' },
  { value: 1, color: '#22c55e', label: 'גשם' },
  { value: 4, color: '#facc15', label: 'גשם חזק' },
  { value: 8, color: '#ef4444', label: 'גשם עז' },
];

export class RainRadar extends RadarLayer {
  readonly name = 'מכ"ם';
  override readonly timeWindow = { backHours: 24, forwardHours: 0, stepHours: 1 };
  protected readonly loopMinutes = 30;
  protected readonly timesRoute = '/radar/get_time_range_to_live_radars';
  private readonly minimumRain = 0.1;
  private readonly radar = new Radar(
    new Provider((radars: RadarLoop[]) => radars.map((radar) => radar.shown.map)),
    RAIN_PALETTE,
    this.minimumRain,
  );
  readonly looks = [
    {
      look: this.radar,
      name: 'גשם',
      checked: true,
    },
  ];

  hover(radars: RadarLoop[], lon: number, lat: number): string {
    const values = radars
      .map((radar) => radar.shown.map.valueAt(lon, lat, 'nearest'))
      .map((value) => (this.radar.noise() ? Math.abs(value) : value))
      .filter((value) => !Number.isNaN(value));
    const most = Math.max(...values);
    if (most < this.minimumRain) return '—';
    return format(most, Quantity.Rain, Unit.MillimetersPerHour);
  }
}
