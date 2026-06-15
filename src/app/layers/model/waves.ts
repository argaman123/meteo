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
    minSpeedMetersPerSecond: 0.3,
    maxSpeedMetersPerSecond: 8,
    minFootprintFraction: 0.4,
    maxFootprintFraction: 0.55,
    footprintPivotMetersPerSecond: 5,
  },
  defaultActive: false,
  defaultOpacity: 0.85,
  timeWindow: { backHours: 24, forwardHours: 96, stepHours: 3 },
};
