import { formatNumber, metersPerSecondToKnots, MISSING_VALUE_TEXT } from '../../utils/format';
import { Layer } from '../layer';
import { colormap, ColorStop, particles, ParticleMotion } from '../look';

const SPEED_PALETTE: ColorStop[] = [
  { value: 0, color: '#6271b7' },
  { value: 2, color: '#39619f' },
  { value: 6, color: '#4a94a9' },
  { value: 10, color: '#4d8d7b' },
  { value: 14, color: '#53a553' },
  { value: 17, color: '#359f35' },
  { value: 21, color: '#a79d51' },
  { value: 25, color: '#9f7f3a' },
  { value: 29, color: '#a16c5c' },
  { value: 33, color: '#813a4e' },
  { value: 37, color: '#af5088' },
  { value: 41, color: '#754a93' },
  { value: 47, color: '#6d61a3' },
];

const MOTION: ParticleMotion = {
  strategy: 'grid',
  speedScale: 0.0018,
  minSpeedMetersPerSecond: 3,
  maxSpeedMetersPerSecond: 25,
  trailPoints: 14,
};

export class Wind extends Layer {
  readonly id = 'wind';
  readonly label = 'רוח';
  readonly parameters = ['u', 'v'];
  readonly looks = [
    particles(([u, v]) => ({ u, v }), MOTION, 'trails', 1.875, 0.9),
    colormap(([u, v]) => metersPerSecondToKnots(Math.hypot(u, v)), SPEED_PALETTE, 'smooth', 0.55),
  ];

  format([u, v]: number[]): string {
    if (Number.isNaN(u) || Number.isNaN(v)) return MISSING_VALUE_TEXT;
    const speed = metersPerSecondToKnots(Math.hypot(u, v));
    const direction = ((Math.atan2(-u, -v) * 180) / Math.PI + 360) % 360;
    return `${formatNumber(speed, 0, ' kt')} / ${formatNumber(direction, 0, '°')}`;
  }
}
