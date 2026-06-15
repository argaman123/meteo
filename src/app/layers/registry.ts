import { LayerCatalogEntry } from './layer-definition';
import { temperatureLayer } from './model/temperature';
import { waveHeightLayer } from './model/wave-height';
import { wavesLayer } from './model/waves';
import { windSpeedLayer } from './model/wind-speed';
import { windLayer } from './model/wind';

export const layerRegistry: LayerCatalogEntry[] = [
  temperatureLayer,
  waveHeightLayer,
  wavesLayer,
  windSpeedLayer,
  windLayer,
];

export function registryEntry(id: string): LayerCatalogEntry | undefined {
  return layerRegistry.find((entry) => entry.id === id);
}
