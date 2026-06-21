import { formatNumber, MISSING_VALUE_TEXT } from '../../utils/format';
import { Layer } from '../layer';
import { colormap, ColorStop, particles, ParticleMotion } from '../look';

const HEIGHT_PALETTE: ColorStop[] = [
  { value: 0, color: '#155e75' },
  { value: 1, color: '#0891b2' },
  { value: 2, color: '#22d3ee' },
  { value: 3, color: '#fde047' },
  { value: 4, color: '#f97316' },
  { value: 5, color: '#dc2626' },
];

const MOTION: ParticleMotion = {
  strategy: 'free',
  speedScale: 0.0024,
  minSpeedMetersPerSecond: 0.5,
  maxSpeedMetersPerSecond: 10,
  lifetimeSeconds: 1.8,
  trailPoints: 2,
  densityFactor: 0.6,
  straightLine: true,
};

export class Waves extends Layer {
  readonly id = 'waves';
  readonly label = 'גלים';
  readonly parameters = ['waveU', 'waveV'];
  readonly looks = [
    particles(([u, v]) => ({ u, v }), MOTION, 'arcs', 1.5, 0.85),
    colormap(([u, v]) => Math.hypot(u, v), HEIGHT_PALETTE, 'stepped', 0.6, {
      min: 0.2,
      max: 99,
    }),
  ];

  format([u, v]: number[]): string {
    if (Number.isNaN(u) || Number.isNaN(v)) return MISSING_VALUE_TEXT;
    const height = Math.hypot(u, v);
    const direction = ((Math.atan2(-u, -v) * 180) / Math.PI + 360) % 360;
    return `${formatNumber(height, 1, ' m')} / ${formatNumber(direction, 0, '°')}`;
  }
}
