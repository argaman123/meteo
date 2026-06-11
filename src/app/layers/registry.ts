import { LayerCatalogEntry } from './layer-definition';
import { temperatureLayer } from './model/temperature';
import { waveHeightLayer } from './model/wave-height';
import { windLayer } from './model/wind';

export const layerRegistry: LayerCatalogEntry[] = [temperatureLayer, waveHeightLayer, windLayer];

export function registryEntry(id: string): LayerCatalogEntry | undefined {
  return layerRegistry.find((entry) => entry.id === id);
}
