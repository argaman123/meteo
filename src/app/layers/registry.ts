import { LookKind } from '../engine/base/look';
import { Geopotential } from './geopotential';
import { Shortcut } from './shortcut';
import { Temperature } from './temperature';
import { Wind } from './wind';

export const layers = {
  temperature: new Temperature(),
  wind: new Wind(),
  geopotential: new Geopotential(),
};

export const shortcuts = {
  weather: new Shortcut('מזג אוויר', [
    { layer: layers.temperature, looks: [LookKind.Colormap] },
    { layer: layers.wind, looks: [LookKind.Particles] },
    { layer: layers.geopotential, looks: [LookKind.Contours] },
  ]),
};
