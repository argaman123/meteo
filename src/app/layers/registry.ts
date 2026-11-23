import { LookKind } from '../engine/base/look';
import { registerLayers } from '../utils/settings';
import { Coordinates } from './general/coordinates';
import { Measurement } from './general/measurement';
import { Geopotential } from './model/geopotential';
import { RelativeHumidity } from './model/relative-humidity';
import { FilteredBirdsLayer } from './birds/filtered-birds-layer';
import { RawBirdRadar } from './birds/raw-bird-radar';
import { LayerGroup } from './base/layer-group';
import { LightningLayer } from './lightning/lightning-layer';
import { RainRadar } from './radar/rain-radar';
import { SatelliteLayer } from './satellite/satellite-layer';
import { SeaLevelPressure } from './model/sea-level-pressure';
import { Shortcut, ShortcutLink } from './base/shortcut';
import { Temperature } from './model/temperature';
import { Waves } from './model/waves';
import { Wind } from './model/wind';
import { ObservationsLayer } from './observations/observations-layer';
import { PolygonsLayer } from './polygons/polygons-layer';

export const layers = registerLayers({
  temperature: new Temperature(),
  wind: new Wind(),
  geopotential: new Geopotential(),
  seaLevelPressure: new SeaLevelPressure(),
  relativeHumidity: new RelativeHumidity(),
  waves: new Waves(),
  satellite: new SatelliteLayer(),
  radar: new RainRadar(),
  polygons: new PolygonsLayer(),
  observations: new ObservationsLayer(),
  filteredBirds: new FilteredBirdsLayer(),
  rawBirdRadar: new RawBirdRadar(),
  lightning: new LightningLayer(),
  coordinates: new Coordinates(),
  measurement: new Measurement(),
});

export const menuLayers = [
  layers.temperature,
  layers.wind,
  layers.geopotential,
  layers.seaLevelPressure,
  layers.relativeHumidity,
  layers.waves,
  layers.satellite,
  layers.radar,
  layers.polygons,
  layers.observations,
  new LayerGroup('ציפורים', [
    { layer: layers.filteredBirds, label: 'מסונן' },
    { layer: layers.rawBirdRadar, label: 'גולמי' },
  ]),
  layers.lightning,
];

export const shortcuts = {
  weather: new Shortcut(
    'מזג אוויר',
    [
      { layer: layers.temperature, looks: [LookKind.Colormap] },
      { layer: layers.wind, looks: [LookKind.Particles] },
      { layer: layers.geopotential, looks: [LookKind.Contours] },
    ],
    'lucideCloudSun',
  ),
  humidity: new Shortcut(
    'לחות',
    [
      { layer: layers.relativeHumidity, looks: [LookKind.Colormap, LookKind.Contours] },
      { layer: layers.seaLevelPressure, looks: [LookKind.Contours, LookKind.Points] },
    ],
    'lucideDroplets',
  ),
  sea: new Shortcut(
    'ים',
    [{ layer: layers.waves, looks: [LookKind.Colormap, LookKind.Particles] }],
    'lucideWaves',
  ),
  imagery: new Shortcut(
    'לוויין ומכ"ם',
    [
      { layer: layers.satellite, looks: [LookKind.Image] },
      { layer: layers.radar, looks: [LookKind.Radar] },
      { layer: layers.lightning, looks: [LookKind.Points] },
    ],
    'lucideSatellite',
  ),
  polygons: new Shortcut(
    'עננות ותופעות',
    [{ layer: layers.polygons, looks: [LookKind.Polygons] }],
    'lucideCloudy',
  ),
  observations: new Shortcut(
    'תצפיות',
    [{ layer: layers.observations, looks: [LookKind.Points] }],
    'lucideBinoculars',
  ),
  birds: new Shortcut(
    'ציפורים',
    [{ layer: layers.filteredBirds, looks: [LookKind.Points] }],
    'lucideBird',
  ),
  dailyForecast: new ShortcutLink('תחזית יומית', '/daily-forecast', 'lucideCalendarDays'),
};
