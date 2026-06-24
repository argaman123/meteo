import { Layer } from './layer';
import { Temperature } from './temperature';

const temperature = new Temperature();

export const layers: Layer[] = [temperature];

export function layerById(id: string): Layer | undefined {
  return layers.find((layer) => layer.id === id);
}

export const defaultActive = new Set<Layer>([temperature]);
