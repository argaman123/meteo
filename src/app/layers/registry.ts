import { Layer } from './layer';
import { Temperature } from './temperature';
import { Wind } from './wind';

export const layers = {
  temperature: new Temperature(),
  wind: new Wind(),
};

export const defaultActive = new Set<Layer>([layers.temperature]);
