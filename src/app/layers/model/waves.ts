import { ParticleLayerCatalogEntry } from '../layer-definition';

// Animated wave-front arcs. Magnitude comes from wave height; direction is a placeholder
// (windDirection) until a real waveDirection field is supplied — see docs/specs/slice-1.md.
export const wavesLayer: ParticleLayerCatalogEntry = {
  id: 'waves',
  label: 'גלים',
  type: 'particles',
  speedParameter: 'waveHeight',
  directionParameter: 'windDirection',
  appearance: 'arcs',
  motion: {
    baseSpeedScale: 0.0013,
    minSpeedMetersPerSecond: 0.4,
    maxSpeedMetersPerSecond: 8,
    minimumCrossingSeconds: 2.4,
    gapFraction: 0.3,
    minFootprintFraction: 0.2,
    maxFootprintFraction: 0.32,
    footprintPivotMetersPerSecond: 5,
  },
  lineWidthPixels: 1.6,
  defaultActive: false,
  defaultOpacity: 0.85,
  timeWindow: { backHours: 24, forwardHours: 96, stepHours: 3 },
};
