import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

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

type Parameter = 'temperature' | 'windSpeed' | 'u' | 'v' | 'waveHeight' | 'waveU' | 'waveV';

function isWave(parameter: Parameter): boolean {
  return parameter === 'waveHeight' || parameter === 'waveU' || parameter === 'waveV';
}

const PARAMETERS: Parameter[] = [
  'temperature',
  'windSpeed',
  'u',
  'v',
  'waveHeight',
  'waveU',
  'waveV',
];

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

interface GfsRecord {
  header: { nx: number; ny: number; lo1: number; la1: number; dx: number; dy: number };
  data: number[];
}

function loadRealWind(): { u: GfsRecord; v: GfsRecord } | null {
  const path = 'tools/data/gfs-surface-wind.json';
  if (!existsSync(path)) return null;
  const records = JSON.parse(readFileSync(path, 'utf8')) as (GfsRecord & {
    header: { parameterNumber: number };
  })[];
  const u = records.find((record) => record.header.parameterNumber === 2);
  const v = records.find((record) => record.header.parameterNumber === 3);
  return u && v ? { u, v } : null;
}

const REAL_WIND = loadRealWind();

function sampleGfs(record: GfsRecord, lat: number, lon: number): number {
  const { nx, ny, lo1, la1, dx, dy } = record.header;
  const col = (((lon - lo1) / dx) % nx + nx) % nx;
  const row = Math.min(ny - 1, Math.max(0, (la1 - lat) / dy));
  const c0 = Math.floor(col);
  const c1 = (c0 + 1) % nx;
  const r0 = Math.floor(row);
  const r1 = Math.min(r0 + 1, ny - 1);
  const fc = col - c0;
  const fr = row - r0;
  const top = record.data[r0 * nx + c0] * (1 - fc) + record.data[r0 * nx + c1] * fc;
  const bottom = record.data[r1 * nx + c0] * (1 - fc) + record.data[r1 * nx + c1] * fc;
  return top * (1 - fr) + bottom * fr;
}

const KNOTS_PER_METER_PER_SECOND = 1.94384;

function windAt(
  lat: number,
  lon: number,
  hours: number,
): { speedKnots: number; directionDegrees: number } {
  if (REAL_WIND) {
    const u = sampleGfs(REAL_WIND.u, lat, lon);
    const v = sampleGfs(REAL_WIND.v, lat, lon);
    return {
      speedKnots: Math.hypot(u, v) * KNOTS_PER_METER_PER_SECOND,
      directionDegrees: ((Math.atan2(-u, -v) * 180) / Math.PI + 360) % 360,
    };
  }
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

interface LandPolygon {
  rings: number[][][];
  west: number;
  south: number;
  east: number;
  north: number;
}

function loadLandPolygons(): LandPolygon[] {
  const geojson = JSON.parse(readFileSync('tools/data/ne_50m_land.geojson', 'utf8')) as {
    features: { geometry: { type: string; coordinates: unknown } }[];
  };
  const polygons: LandPolygon[] = [];
  for (const feature of geojson.features) {
    const { type, coordinates } = feature.geometry;
    const polygonList =
      type === 'Polygon'
        ? [coordinates as number[][][]]
        : type === 'MultiPolygon'
          ? (coordinates as number[][][][])
          : [];
    for (const rings of polygonList) {
      let west = Infinity;
      let south = Infinity;
      let east = -Infinity;
      let north = -Infinity;
      for (const [lon, lat] of rings[0]) {
        west = Math.min(west, lon);
        south = Math.min(south, lat);
        east = Math.max(east, lon);
        north = Math.max(north, lat);
      }
      polygons.push({ rings, west, south, east, north });
    }
  }
  return polygons;
}

const LAND_POLYGONS = loadLandPolygons();

function isLand(lat: number, lon: number): boolean {
  for (const polygon of LAND_POLYGONS) {
    if (lon < polygon.west || lon > polygon.east || lat < polygon.south || lat > polygon.north) {
      continue;
    }
    let crossings = 0;
    for (const ring of polygon.rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
          crossings++;
        }
      }
    }
    if (crossings % 2 === 1) return true;
  }
  return false;
}

function waveHeightAt(lat: number, lon: number, hours: number): number {
  const jet = jetLatitude(lon, hours);
  const swell = 1.6 + 1.4 * Math.sin(lon / 15 + hours / 12) * Math.cos(lat / 20);
  const storm = 1.8 * Math.exp(-Math.abs(lat - jet) / 6);
  return Math.max(0, swell + storm);
}

function field(lat: number, lon: number, hours: number, kind: Parameter): number {
  if (kind === 'waveHeight') return round1(waveHeightAt(lat, lon, hours));
  if (kind === 'temperature') return round1(temperatureAt(lat, lon, hours));
  const wind = windAt(lat, lon, hours);
  if (kind === 'windSpeed') return round1(wind.speedKnots);
  const radians = (wind.directionDegrees * Math.PI) / 180;
  if (kind === 'waveU' || kind === 'waveV') {
    const height = waveHeightAt(lat, lon, hours);
    return round1(kind === 'waveU' ? -height * Math.sin(radians) : -height * Math.cos(radians));
  }
  const speedMs = wind.speedKnots / KNOTS_PER_METER_PER_SECOND;
  return round1(kind === 'u' ? -speedMs * Math.sin(radians) : -speedMs * Math.cos(radians));
}

function landMaskFor(geometry: Model): Uint8Array {
  const mask = new Uint8Array(geometry.rows * geometry.cols);
  for (let r = 0; r < geometry.rows; r++) {
    const lat = geometry.startLat + geometry.deltaLat * r;
    for (let c = 0; c < geometry.cols; c++) {
      if (isLand(lat, geometry.startLon + geometry.deltaLon * c)) {
        mask[r * geometry.cols + c] = 1;
      }
    }
  }
  return mask;
}

function fixtureFileName(parameter: string, hours: number): string {
  const sign = hours < 0 ? '-' : '+';
  return `${parameter}_${sign}${String(Math.abs(hours)).padStart(3, '0')}.json`;
}

const WAVE_DELTA_DEGREES = 0.3;

function gridGeometry(model: Model, parameter: Parameter): Model {
  if (!isWave(parameter)) return model;
  const endLat = model.startLat + model.deltaLat * (model.rows - 1);
  const endLon = model.startLon + model.deltaLon * (model.cols - 1);
  return {
    ...model,
    deltaLat: -WAVE_DELTA_DEGREES,
    deltaLon: WAVE_DELTA_DEGREES,
    rows: Math.floor((model.startLat - endLat) / WAVE_DELTA_DEGREES) + 1,
    cols: Math.floor((endLon - model.startLon) / WAVE_DELTA_DEGREES) + 1,
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

rmSync('public/fixtures/models', { recursive: true, force: true });

for (const model of MODELS) {
  const dir = `public/fixtures/models/${model.name}`;
  mkdirSync(dir, { recursive: true });
  for (const parameter of PARAMETERS) {
    const geometry = gridGeometry(model, parameter);
    const landMask = isWave(parameter) ? landMaskFor(geometry) : null;
    for (const hours of FRAME_HOURS) {
      const values: (number | null)[][] = [];
      for (let r = 0; r < geometry.rows; r++) {
        const row: (number | null)[] = [];
        const lat = geometry.startLat + geometry.deltaLat * r;
        for (let c = 0; c < geometry.cols; c++) {
          if (landMask && landMask[r * geometry.cols + c]) {
            row.push(null);
          } else {
            row.push(field(lat, geometry.startLon + geometry.deltaLon * c, hours, parameter));
          }
        }
        values.push(row);
      }
      const doc = {
        rx: geometry.deltaLon,
        ry: geometry.deltaLat,
        start_x: geometry.startLon,
        start_y: geometry.startLat,
        wrap_info: {
          base_time: RUN_TIME_UNIX_SECONDS,
          forecast_time: hours,
          model: model.name,
          param: parameter,
          pressure: null,
          height: null,
        },
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
