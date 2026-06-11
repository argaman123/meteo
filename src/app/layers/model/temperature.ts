import { ColormapLayerCatalogEntry } from '../layer-definition';

export const temperatureLayer: ColormapLayerCatalogEntry = {
  id: 'temperature',
  label: 'טמפרטורה',
  type: 'colormap',
  parameter: 'temperature',
  palette: [
    { value: -30, color: '#312e81' },
    { value: -15, color: '#1d4ed8' },
    { value: 0, color: '#0ea5e9' },
    { value: 10, color: '#34d399' },
    { value: 20, color: '#fbbf24' },
    { value: 30, color: '#f97316' },
    { value: 40, color: '#dc2626' },
  ],
  paletteStyle: 'smooth',
  defaultActive: true,
  defaultOpacity: 0.45,
  timeWindow: { backHours: 24, forwardHours: 96, stepHours: 3 },
};
