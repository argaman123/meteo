import { ObservationParam, ObservationPoint } from '../../types/observations';
import { hoursToMs, minutesToMs } from '../../utils/time';
import { LandPolygon, collectLandPolygons, isLand } from './synthetic-weather';

const STATION_COUNT = 1000;

interface Station {
  lat: number;
  lon: number;
  base: number;
}

let stationsPromise: Promise<Station[]> | null = null;

function ripple(lat: number, lon: number, drift: number, latScale: number, lonScale: number, phase: number): number {
  return (
    Math.sin((lat / latScale) * Math.PI + drift + phase) *
    Math.cos((lon / lonScale) * Math.PI - drift * 0.6 + phase * 2)
  );
}

const PARAM_MAKERS: Record<
  string,
  (lat: number, lon: number, drift: number, jitter: number) => ObservationParam[]
> = {
  TMP: (lat, lon, drift, jitter) => [
    {
      name: 'temperature',
      value: round1(24 - (lat - 31) * 0.9 + ripple(lat, lon, drift, 5, 7, 0) * 10 + jitter * 2),
    },
  ],
  WIND: (lat, lon, drift, jitter) => [
    {
      name: 'wind_speed',
      value: Math.round(Math.max(0, ((ripple(lat, lon, drift, 6, 9, 1.3) + 1) / 2) * 55 + jitter * 6)),
    },
    { name: 'wind_direction', value: Math.round(((ripple(lat, lon, drift, 9, 9, 0.4) + 1) / 2) * 359) },
  ],
  RAIN: (lat, lon, drift, jitter) => {
    const wetness = (ripple(lat, lon, drift, 4, 6, 2.6) + 1) / 2;
    return [{ name: 'precipitation', value: wetness < 0.55 ? 0 : round1((wetness - 0.55) * 22 + jitter) }];
  },
  CLOUD: (lat, lon, drift, jitter) => {
    const cover = (ripple(lat, lon, drift, 7, 8, 3.9) + 1) / 2;
    const lowest = Math.min(8, Math.max(0, Math.round((cover * 1.6 - 0.3) * 8 + jitter)));
    const baseMeters =
      Math.round(
        Math.min(6000, Math.max(150, ((ripple(lat, lon, drift, 6, 10, 5.2) + 1) / 2) * 5900 + 150 + jitter * 270)) /
          150,
      ) * 150;
    const layers = lowest === 0 ? [{ cover: 0, base: NaN }] : [{ cover: Math.min(3, lowest), base: baseMeters }];
    if (lowest > 3) layers.push({ cover: lowest, base: baseMeters + 1500 });
    return layers.flatMap((layer, index) => [
      { name: `cloud_cover_${index + 1}`, value: layer.cover },
      ...(Number.isNaN(layer.base) ? [] : [{ name: `cloud_base_${index + 1}`, value: layer.base }]),
    ]);
  },
};

export async function syntheticObservations(
  param: string,
  start: number,
  end: number,
): Promise<ObservationPoint[]> {
  const stations = await loadStations();
  const makeParams = PARAM_MAKERS[param] ?? PARAM_MAKERS['TMP'];
  return stations.flatMap((station, index): ObservationPoint[] => {
    const cadence = index % 5 === 0 ? hoursToMs(1) : minutesToMs(10);
    const phase = index * minutesToMs(10);
    const lastUpdate = Math.floor((end - 1 - phase) / cadence) * cadence + phase;
    if (lastUpdate < start) return [];
    const drift = lastUpdate / hoursToMs(3);
    const jitter = fraction(index * 17.517) * 2 - 1;
    return [
      {
        coords: [[station.lon, station.lat]],
        params: makeParams(station.lat, station.lon, drift, jitter),
      },
    ];
  });
}

function loadStations(): Promise<Station[]> {
  stationsPromise ??= buildStations();
  return stationsPromise;
}

async function buildStations(): Promise<Station[]> {
  const [supplied, landGeojson] = await Promise.all([
    fetch('/fixtures/observations/temperature.json').then(
      (response) => response.json() as Promise<{ lat: number; lon: number; value: number }[]>,
    ),
    fetch('/fixtures/land.geojson').then((response) => response.json()),
  ]);
  const land: LandPolygon[] = collectLandPolygons(landGeojson);
  const stations: Station[] = supplied.map((point) => ({
    lat: point.lat,
    lon: point.lon,
    base: point.value,
  }));
  for (let seed = 0; stations.length < STATION_COUNT && seed < STATION_COUNT * 40; seed++) {
    const lon = 20 + fraction(seed * 12.9898) * 32;
    const lat = 18 + fraction(seed * 78.233) * 26;
    if (!isLand(land, lat, lon)) continue;
    stations.push({ lat, lon, base: 34 - (lat - 18) * 0.55 + fraction(seed * 39.425) * 6 - 3 });
  }
  return stations;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function fraction(seed: number): number {
  const scrambled = Math.sin(seed) * 43758.5453;
  return scrambled - Math.floor(scrambled);
}
