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
    startLat: 52,
    startLon: 0,
    deltaLat: -0.25,
    deltaLon: 0.25,
    rows: 113,
    cols: 201,
  },
];
const STEP_HOURS = 3;
const BACK_HOURS = 24;
const FORWARD_HOURS = 96;
const FRAME_HOURS: number[] = [];
for (let h = -BACK_HOURS; h <= FORWARD_HOURS; h += STEP_HOURS) FRAME_HOURS.push(h);

const RUN_TIME_UNIX_SECONDS =
  Math.floor(Date.now() / 1000 / (STEP_HOURS * 3600)) * (STEP_HOURS * 3600);
const RUN_TIME_ISO = new Date(RUN_TIME_UNIX_SECONDS * 1000).toISOString();

type Parameter = 'temperature' | 'windSpeed' | 'windDirection' | 'waveHeight';

const UNITS: Record<Parameter, string> = {
  temperature: 'C',
  windSpeed: 'kt',
  windDirection: 'deg',
  waveHeight: 'm',
};

interface PressureSystem {
  lat: number;
  lon: number;
  strengthHpa: number;
  latRadiusDeg: number;
  lonRadiusDeg: number;
  driftLonPerHour: number;
}

const PRESSURE_SYSTEMS: PressureSystem[] = [
  { lat: 56, lon: 6, strengthHpa: -9, latRadiusDeg: 5, lonRadiusDeg: 10, driftLonPerHour: 0.5 },
  { lat: 51, lon: 44, strengthHpa: -7, latRadiusDeg: 4, lonRadiusDeg: 9, driftLonPerHour: 0.45 },
];

function jetLatitude(lon: number, hours: number): number {
  const longWave = 8 * Math.sin(((lon - 1.2 * hours - 15) / 55) * 2 * Math.PI);
  const shortWave = 3 * Math.sin(((lon + 0.6 * hours) / 23) * 2 * Math.PI);
  return 44 + longWave + shortWave;
}

function pressureAt(lat: number, lon: number, hours: number): number {
  const jet = jetLatitude(lon, hours);
  let pressure = 1014 - 14 * Math.tanh((lat - jet) / 9) + 7 * Math.tanh((lat - 30) / 8);
  for (const system of PRESSURE_SYSTEMS) {
    const dLat = (lat - system.lat) / system.latRadiusDeg;
    const dLon = (lon - (system.lon + system.driftLonPerHour * hours)) / system.lonRadiusDeg;
    pressure += system.strengthHpa * Math.exp(-(dLat * dLat + dLon * dLon) / 2);
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
  const u = -dPdLat * 24;
  const v = dPdLon * 24;
  const speedKnots = Math.min(65, Math.hypot(u, v));
  const directionDegrees = ((Math.atan2(-u, -v) * 180) / Math.PI + 360) % 360;
  return { speedKnots, directionDegrees };
}

function temperatureAt(lat: number, lon: number, hours: number): number {
  const jet = jetLatitude(lon, hours);
  const latitudinal = 34 - 0.7 * (lat - 20);
  const baroclinic = 5 * Math.tanh((jet - lat) / 8);
  const regionalTexture = 1.5 * Math.sin(lon / 6 + 1) * Math.cos(lat / 4.5);
  const diurnal = 2 * Math.sin(((hours - 3) / 24) * 2 * Math.PI);
  return latitudinal + baroclinic + regionalTexture + diurnal;
}

function isLand(lat: number, lon: number): boolean {
  return Math.sin((lat - 10) / 8) * Math.cos((lon - 20) / 14) > 0.45;
}

function waveHeightAt(lat: number, lon: number, hours: number): number {
  const jet = jetLatitude(lon, hours);
  const swell = 1.6 + 1.4 * Math.sin(lon / 15 + hours / 12) * Math.cos(lat / 20);
  const storm = 1.8 * Math.exp(-Math.abs(lat - jet) / 6);
  return Math.max(0, swell + storm);
}

function field(lat: number, lon: number, hours: number, kind: Parameter): number | null {
  if (kind === 'waveHeight') {
    return isLand(lat, lon) ? null : round1(waveHeightAt(lat, lon, hours));
  }
  if (kind === 'temperature') return round1(temperatureAt(lat, lon, hours));
  const wind = windAt(lat, lon, hours);
  if (kind === 'windSpeed') return round1(wind.speedKnots);
  return round1(wind.directionDegrees);
}

function fixtureFileName(parameter: string, hours: number): string {
  const sign = hours < 0 ? '-' : '+';
  return `${parameter}_${sign}${String(Math.abs(hours)).padStart(3, '0')}.json`;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

rmSync('public/fixtures/models', { recursive: true, force: true });

for (const model of MODELS) {
  const dir = `public/fixtures/models/${model.name}`;
  mkdirSync(dir, { recursive: true });
  for (const parameter of Object.keys(UNITS) as Parameter[]) {
    for (const hours of FRAME_HOURS) {
      const values: (number | null)[][] = [];
      for (let r = 0; r < model.rows; r++) {
        const row: (number | null)[] = [];
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
        runTime: RUN_TIME_ISO,
        forecastHours: hours,
        startLat: model.startLat,
        startLon: model.startLon,
        deltaLat: model.deltaLat,
        deltaLon: model.deltaLon,
        rows: model.rows,
        cols: model.cols,
        values,
      };
      writeFileSync(`${dir}/${fixtureFileName(parameter, hours)}`, JSON.stringify(doc));
    }
  }
}

writeFileSync(
  'public/fixtures/models/manifest.json',
  JSON.stringify({
    runTimeUnixSeconds: RUN_TIME_UNIX_SECONDS,
    stepHours: STEP_HOURS,
    backHours: BACK_HOURS,
    forwardHours: FORWARD_HOURS,
  }),
);

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
