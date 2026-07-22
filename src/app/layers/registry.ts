import { LookKind } from '../engine/base/look';
import { registerLayers } from '../utils/settings';
import { Coordinates } from './coordinates/coordinates';
import { Geopotential } from './model/geopotential';
import { Shortcut } from './base/shortcut';
import { Temperature } from './model/temperature';
import { Wind } from './model/wind';
import { PolygonsLayer } from './polygons/polygons-layer';

export const layers = registerLayers({
  temperature: new Temperature(),
  wind: new Wind(),
  geopotential: new Geopotential(),
  polygons: new PolygonsLayer(),
  coordinates: new Coordinates(),
});

export const shortcuts = {
  weather: new Shortcut('מזג אוויר', [
    { layer: layers.temperature, looks: [LookKind.Colormap] },
    { layer: layers.wind, looks: [LookKind.Particles] },
    { layer: layers.geopotential, looks: [LookKind.Contours] },
  ]),
};
