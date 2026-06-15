import { ParticleLayerCatalogEntry } from '../layer-definition';

export const windLayer: ParticleLayerCatalogEntry = {
  id: 'wind',
  label: 'רוח',
  type: 'particles',
  speedParameter: 'windSpeed',
  directionParameter: 'windDirection',
  appearance: 'trails',
  motion: {
    minSpeedMetersPerSecond: 3,
    maxSpeedMetersPerSecond: 25,
    minFootprintFraction: 0.08,
    maxFootprintFraction: 0.85,
    footprintPivotMetersPerSecond: 18,
  },
  defaultActive: true,
  defaultOpacity: 0.9,
  timeWindow: { backHours: 24, forwardHours: 96, stepHours: 3 },
};
