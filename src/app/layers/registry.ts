import { Geopotential } from './geopotential';
import { Layer } from './layer';
import { Temperature } from './temperature';
import { Wind } from './wind';

export const layers = {
  temperature: new Temperature(),
  wind: new Wind(),
  geopotential: new Geopotential(),
};

export const defaultActiveLayers = new Set<Layer>([
  layers.temperature,
  layers.wind,
  layers.geopotential,
]);
