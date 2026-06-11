import { ColormapLayerCatalogEntry } from '../layer-definition';

export const waveHeightLayer: ColormapLayerCatalogEntry = {
  id: 'waveHeight',
  label: 'גובה גלים',
  type: 'colormap',
  parameter: 'waveHeight',
  palette: [
    { value: 0, color: '#155e75' },
    { value: 1, color: '#0891b2' },
    { value: 2, color: '#22d3ee' },
    { value: 3, color: '#fde047' },
    { value: 4, color: '#f97316' },
    { value: 5, color: '#dc2626' },
  ],
  paletteStyle: 'stepped',
  defaultActive: false,
  defaultOpacity: 0.6,
  visibleRange: { min: 0.2, max: 99 },
  timeWindow: { backHours: 24, forwardHours: 96, stepHours: 3 },
};
