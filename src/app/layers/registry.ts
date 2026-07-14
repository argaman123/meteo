import { LookKind } from '../engine/base/look';
import { registerLayers } from '../utils/settings';
import { Geopotential } from './parameters/geopotential';
import { Shortcut } from './base/shortcut';
import { Temperature } from './parameters/temperature';
import { Wind } from './parameters/wind';

export const layers = registerLayers({
  temperature: new Temperature(),
  wind: new Wind(),
  geopotential: new Geopotential(),
});

export const shortcuts = {
  weather: new Shortcut('מזג אוויר', [
    { layer: layers.temperature, looks: [LookKind.Colormap] },
    { layer: layers.wind, looks: [LookKind.Particles] },
    { layer: layers.geopotential, looks: [LookKind.Contours] },
  ]),
};
