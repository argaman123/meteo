import { CloudPoint, ObservationPoint } from '../../types/observations';
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

const VALUE_MAKERS: Record<
  string,
  (lat: number, lon: number, drift: number, jitter: number) => { value: number; base?: number }
> = {
  temperature: (lat, lon, drift, jitter) => ({
    value: 24 - (lat - 31) * 0.9 + ripple(lat, lon, drift, 5, 7, 0) * 10 + jitter * 2,
  }),
  windSpeed: (lat, lon, drift, jitter) => ({
    value: Math.max(0, ((ripple(lat, lon, drift, 6, 9, 1.3) + 1) / 2) * 28 + jitter * 3),
  }),
  rain: (lat, lon, drift, jitter) => {
    const wetness = (ripple(lat, lon, drift, 4, 6, 2.6) + 1) / 2;
    return { value: wetness < 0.55 ? 0 : (wetness - 0.55) * 22 + jitter };
  },
  cloud: (lat, lon, drift, jitter) => {
    const cover = (ripple(lat, lon, drift, 7, 8, 3.9) + 1) / 2;
    return {
      value: Math.min(8, Math.max(0, Math.round((cover * 1.6 - 0.3) * 8 + jitter))),
      base:
        Math.round(
          Math.min(20000, Math.max(500, ((ripple(lat, lon, drift, 6, 10, 5.2) + 1) / 2) * 19500 + 500 + jitter * 900)) /
            500,
        ) * 500,
    };
  },
};

export async function syntheticObservations(
  parameter: string,
  time: number,
): Promise<ObservationPoint[]> {
  const stations = await loadStations();
  const makeValue = VALUE_MAKERS[parameter] ?? VALUE_MAKERS['temperature'];
  return stations.map((station, index): CloudPoint => {
    const cadence = index % 5 === 0 ? hoursToMs(1) : minutesToMs(10);
    const phase = index * minutesToMs(10);
    const lastUpdate = Math.floor((time - phase) / cadence) * cadence + phase;
    const drift = lastUpdate / hoursToMs(3);
    const jitter = fraction(index * 17.517) * 2 - 1;
    const made = makeValue(station.lat, station.lon, drift, jitter);
    return {
      lat: station.lat,
      lon: station.lon,
      value: Number(made.value.toFixed(1)),
      ...(made.base === undefined ? {} : { base: made.base }),
    };
  });
}

function loadStations(): Promise<Station[]> {
  stationsPromise ??= buildStations();
  return stationsPromise;
}

async function buildStations(): Promise<Station[]> {
  const [supplied, landGeojson] = await Promise.all([
    fetch('/fixtures/observations/temperature.json').then(
      (response) => response.json() as Promise<ObservationPoint[]>,
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

function fraction(seed: number): number {
  const scrambled = Math.sin(seed) * 43758.5453;
  return scrambled - Math.floor(scrambled);
}
