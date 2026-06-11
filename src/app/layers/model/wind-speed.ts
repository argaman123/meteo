import { ColormapLayerCatalogEntry } from '../layer-definition';

export const windSpeedLayer: ColormapLayerCatalogEntry = {
  id: 'windSpeed',
  label: 'מהירות רוח',
  type: 'colormap',
  parameter: 'windSpeed',
  palette: [
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
  ],
  paletteStyle: 'smooth',
  defaultActive: false,
  defaultOpacity: 0.55,
  timeWindow: { backHours: 24, forwardHours: 96, stepHours: 3 },
};
