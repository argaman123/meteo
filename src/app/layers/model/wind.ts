import { ParticleLayerCatalogEntry } from '../layer-definition';

export const windLayer: ParticleLayerCatalogEntry = {
  id: 'wind',
  label: 'רוח',
  type: 'particles',
  speedParameter: 'windSpeed',
  directionParameter: 'windDirection',
  appearance: 'trails',
  motion: {
    baseSpeedScale: 0.0027,
    minSpeedMetersPerSecond: 3,
    maxSpeedMetersPerSecond: 25,
    minimumCrossingSeconds: 1.8,
    gapFraction: 0.35,
    minFootprintFraction: 0.08,
    maxFootprintFraction: 0.85,
    footprintPivotMetersPerSecond: 18,
  },
  lineWidthPixels: 1.875,
  defaultActive: true,
  defaultOpacity: 0.9,
  timeWindow: { backHours: 24, forwardHours: 96, stepHours: 3 },
};
