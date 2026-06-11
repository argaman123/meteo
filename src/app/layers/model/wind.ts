import { ParticleLayerCatalogEntry } from '../layer-definition';

export const windLayer: ParticleLayerCatalogEntry = {
  id: 'wind',
  label: 'רוח',
  type: 'particles',
  speedParameter: 'windSpeed',
  directionParameter: 'windDirection',
  defaultActive: true,
  defaultOpacity: 0.9,
  timeWindow: { backHours: 24, forwardHours: 96, stepHours: 3 },
};
