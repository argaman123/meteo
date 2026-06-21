import { Layer } from './layer';
import { Temperature } from './model/temperature';
import { Waves } from './model/waves';
import { Wind } from './model/wind';

export const layerRegistry: Layer[] = [new Temperature(), new Waves(), new Wind()];

export function registryEntry(id: string): Layer | undefined {
  return layerRegistry.find((layer) => layer.id === id);
}
