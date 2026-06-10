import { mkdirSync, writeFileSync } from 'node:fs';

type Model = {
  name: string;
  startLat: number;
  startLon: number;
  deltaLat: number;
  deltaLon: number;
  rows: number;
  cols: number;
};

const MODELS: Model[] = [
  { name: 'eaa', startLat: 72, startLon: -25, deltaLat: -0.5, deltaLon: 0.5, rows: 225, cols: 351 },
  {
    name: 'mideast',
    startLat: 42,
    startLon: 24,
    deltaLat: -0.05,
    deltaLon: 0.05,
    rows: 361,
    cols: 481,
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

function field(lat: number, lon: number, hours: number, kind: Parameter): number {
  const wave = Math.sin(lon / 14) * Math.cos(lat / 9) + Math.sin((lon + lat) / 23 + hours / 6);
  if (kind === 'temperature') {
    const seasonal = 32 - Math.abs(lat - 12) * 0.7;
    return round1(seasonal + wave * 4 + Math.sin((hours / 12) * Math.PI) * 3);
  }
  if (kind === 'windSpeed') return round1(Math.max(0, 16 + wave * 12));
  return round1(
    ((Math.atan2(Math.cos(lat / 11), Math.sin(lon / 17 + hours / 8)) * 180) / Math.PI + 360) % 360,
  );
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

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
