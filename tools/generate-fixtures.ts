import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

interface Model {
  name: string;
  startLat: number;
  startLon: number;
  deltaLat: number;
  deltaLon: number;
  rows: number;
  cols: number;
}

const MODELS: Model[] = [
  { name: 'wide', startLat: 60, startLon: -10, deltaLat: -0.5, deltaLon: 0.5, rows: 81, cols: 141 },
  {
    name: 'local',
    startLat: 48,
    startLon: 10,
    deltaLat: -0.25,
    deltaLon: 0.25,
    rows: 113,
    cols: 201,
  },
];
const FORECAST_HOURS = [0, 6, 12];
const RUN_TIME = '2026-06-10T00:00Z';

type Parameter = 'temperature' | 'windSpeed' | 'windDirection';

const UNITS: Record<Parameter, string> = {
  temperature: 'C',
  windSpeed: 'kt',
  windDirection: 'deg',
};

interface PressureSystem {
  lat: number;
  lon: number;
  strengthHpa: number;
  radiusDeg: number;
  driftLonPerHour: number;
}

const PRESSURE_SYSTEMS: PressureSystem[] = [
  { lat: 52, lon: 5, strengthHpa: -16, radiusDeg: 9, driftLonPerHour: 0.35 },
  { lat: 30, lon: 42, strengthHpa: 12, radiusDeg: 13, driftLonPerHour: 0.1 },
  { lat: 38, lon: -5, strengthHpa: 8, radiusDeg: 10, driftLonPerHour: 0.15 },
  { lat: 44, lon: 38, strengthHpa: -10, radiusDeg: 8, driftLonPerHour: 0.3 },
];

function pressureAt(lat: number, lon: number, hours: number): number {
  let pressure = 1013;
  for (const system of PRESSURE_SYSTEMS) {
    const dLat = lat - system.lat;
    const dLon =
      (lon - (system.lon + system.driftLonPerHour * hours)) * Math.cos((lat * Math.PI) / 180);
    const distanceSquared = dLat * dLat + dLon * dLon;
    pressure +=
      system.strengthHpa * Math.exp(-distanceSquared / (2 * system.radiusDeg * system.radiusDeg));
  }
  return pressure;
}

function windAt(
  lat: number,
  lon: number,
  hours: number,
): { speedKnots: number; directionDegrees: number } {
  const step = 0.5;
  const dPdLat =
    (pressureAt(lat + step, lon, hours) - pressureAt(lat - step, lon, hours)) / (2 * step);
  const dPdLon =
    (pressureAt(lat, lon + step, hours) - pressureAt(lat, lon - step, hours)) / (2 * step);
  const u = -dPdLat * 22;
  const v = dPdLon * 22;
  const speedKnots = Math.min(60, Math.hypot(u, v));
  const directionDegrees = ((Math.atan2(-u, -v) * 180) / Math.PI + 360) % 360;
  return { speedKnots, directionDegrees };
}

function temperatureAt(lat: number, lon: number, hours: number): number {
  const latitudinal = 36 - (lat - 18) * 0.85;
  const regionalTexture = 2.2 * Math.sin(lon / 7) * Math.cos(lat / 5);
  const pressureEffect = (1013 - pressureAt(lat, lon, hours)) * 0.25;
  const diurnal = 2 * Math.sin(((hours - 3) / 24) * 2 * Math.PI);
  return latitudinal + regionalTexture + pressureEffect + diurnal;
}

function field(lat: number, lon: number, hours: number, kind: Parameter): number {
  if (kind === 'temperature') return round1(temperatureAt(lat, lon, hours));
  const wind = windAt(lat, lon, hours);
  if (kind === 'windSpeed') return round1(wind.speedKnots);
  return round1(wind.directionDegrees);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

rmSync('public/fixtures/models', { recursive: true, force: true });

for (const model of MODELS) {
  const dir = `public/fixtures/models/${model.name}`;
  mkdirSync(dir, { recursive: true });
  for (const parameter of Object.keys(UNITS) as Parameter[]) {
    for (const hours of FORECAST_HOURS) {
      const values: number[][] = [];
      for (let r = 0; r < model.rows; r++) {
        const row: number[] = [];
        const lat = model.startLat + model.deltaLat * r;
        for (let c = 0; c < model.cols; c++) {
          row.push(field(lat, model.startLon + model.deltaLon * c, hours, parameter));
        }
        values.push(row);
      }
      const doc = {
        parameter,
        level: 'surface',
        units: UNITS[parameter],
        runTime: RUN_TIME,
        forecastHours: hours,
        startLat: model.startLat,
        startLon: model.startLon,
        deltaLat: model.deltaLat,
        deltaLon: model.deltaLon,
        rows: model.rows,
        cols: model.cols,
        values,
      };
      writeFileSync(
        `${dir}/${parameter}_+${String(hours).padStart(3, '0')}.json`,
        JSON.stringify(doc),
      );
    }
  }
}

mkdirSync('public/fixtures/observations', { recursive: true });
const stations: [number, number][] = [
  [32.0, 34.8],
  [31.8, 35.2],
  [29.6, 34.9],
  [33.8, 35.5],
  [30.1, 31.2],
  [36.2, 37.2],
  [33.3, 44.4],
  [24.7, 46.7],
  [41.0, 29.0],
  [35.7, 51.4],
  [25.3, 51.5],
  [31.9, 47.8],
];
for (const parameter of ['temperature', 'windSpeed'] as Parameter[]) {
  const observations = stations.map(([lat, lon]) => ({
    lat,
    lon,
    value: field(lat, lon, 0, parameter),
  }));
  writeFileSync(
    `public/fixtures/observations/${parameter}.json`,
    JSON.stringify(observations, null, 2),
  );
}
