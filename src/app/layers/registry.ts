import { LookKind } from '../engine/base/look';
import { registerLayers } from '../utils/settings';
import { Coordinates } from './general/coordinates';
import { Geopotential } from './model/geopotential';
import { RadarLayer } from './radar/radar-layer';
import { SatelliteLayer } from './satellite/satellite-layer';
import { Shortcut } from './base/shortcut';
import { Temperature } from './model/temperature';
import { Wind } from './model/wind';
import { ObservationsLayer } from './observations/observations-layer';
import { PolygonsLayer } from './polygons/polygons-layer';

export const layers = registerLayers({
  temperature: new Temperature(),
  wind: new Wind(),
  geopotential: new Geopotential(),
  satellite: new SatelliteLayer(),
  radar: new RadarLayer(),
  polygons: new PolygonsLayer(),
  observations: new ObservationsLayer(),
  coordinates: new Coordinates(),
});

export const menuLayers = [
  layers.temperature,
  layers.wind,
  layers.geopotential,
  layers.satellite,
  layers.radar,
  layers.polygons,
  layers.observations,
];

export const shortcuts = {
  weather: new Shortcut('מזג אוויר', [
    { layer: layers.temperature, looks: [LookKind.Colormap] },
    { layer: layers.wind, looks: [LookKind.Particles] },
    { layer: layers.geopotential, looks: [LookKind.Contours] },
  ]),
};
