import { AirLevelData } from '../../types/sounding';
import { Bounds, ModelWrapInfo, Wrap } from '../../types/wrap';
import {
  dewpoint,
  feetAtPressure,
  relativeHumidity,
  saturationVaporPressure,
} from '../../utils/thermodynamics';
import { daysToMs, hoursToMs, msToHours } from '../../utils/time';

interface Manifest {
  baseTime: number;
  west: number;
  south: number;
  resolution: number;
  columns: number;
  rows: number;
  steps: number[];
  pressures: number[];
  fields: Record<string, { levels: 'pressure' | 'surface' | 'wave'; scale: number; offset: number }>;
  missing: number;
}

interface Model {
  name: string;
  archiveName: string;
  bounds: Bounds;
}

type Sampler = (lat: number, lon: number) => number;

const MODELS: Model[] = [
  { name: 'BIG_ECMWF', archiveName: 'ECMWF03', bounds: [-10, 20, 60, 60] },
  { name: 'ECMWF', archiveName: 'ECMWF01', bounds: [0, 24, 50, 52] },
  { name: 'ECMWF_WAVE', archiveName: 'ECMWFGAL01', bounds: [-10, 20, 60, 60] },
];

const SURFACE_FIELDS: Record<string, string> = {
  TMP: '2t',
  SURFACE_TMP: '2t',
  U: '10u',
  V: '10v',
  SLP: 'msl',
  WAVE_HEIGHT: 'swh',
  WAVE_DIR: 'mwd',
};

const PRESSURE_FIELDS: Record<string, string> = {
  TMP: 't',
  U: 'u',
  V: 'v',
  HGT: 'gh',
  RH: 'r',
};

const RESPONSE_SIZE = 70;
const KNOTS_PER_METER_PER_SECOND = 1.94384;
const CACHED_FILES = 80;

export class EcmwfWeather {
  private readonly files = new Map<string, Promise<Int16Array>>();
  private readonly baseTime: number;
  private readonly lastStep: number;

  constructor(
    private readonly manifest: Manifest,
    runTime: number,
  ) {
    const daysBack = Math.floor((runTime - hoursToMs(24) - manifest.baseTime) / daysToMs(1));
    this.baseTime = manifest.baseTime + daysToMs(daysBack);
    this.lastStep = manifest.steps[manifest.steps.length - 1];
  }

  static async load(runTime: number): Promise<EcmwfWeather | null> {
    try {
      const manifest = (await fetch('/fixtures/ecmwf/manifest.json').then((response) =>
        response.json(),
      )) as Manifest;
      return new EcmwfWeather(manifest, runTime);
    } catch {
      console.error('ECMWF fixture data is missing — run `npm run ecmwf:fetch`');
      return null;
    }
  }

  async wrap(
    modelName: string,
    wireParameter: string,
    bounds: Bounds,
    time: number,
    heightFeet: number | null,
    pressureMb: number | null,
    reduction: number | null,
  ): Promise<Wrap<ModelWrapInfo> | null> {
    const model = MODELS.find((candidate) => candidate.name === modelName);
    if (!model) return null;
    const west = Math.max(bounds[0], model.bounds[0]);
    const south = Math.max(bounds[1], model.bounds[1]);
    const east = Math.min(bounds[2], model.bounds[2]);
    const north = Math.min(bounds[3], model.bounds[3]);
    if (west >= east || south >= north) return null;
    const sampler = await this.timeSampler(wireParameter, time, heightFeet, pressureMb);
    if (!sampler) return null;
    const { resolution } = this.manifest;
    const startX = reduction === null ? west : this.snapToData(west, this.manifest.west);
    const startY = reduction === null ? south : this.snapToData(south, this.manifest.south);
    const rx = reduction === null ? (east - west) / (RESPONSE_SIZE - 1) : resolution * reduction;
    const ry = reduction === null ? (north - south) / (RESPONSE_SIZE - 1) : resolution * reduction;
    const columns = reduction === null ? RESPONSE_SIZE : Math.floor((east - startX) / rx) + 1;
    const rows = reduction === null ? RESPONSE_SIZE : Math.floor((north - startY) / ry) + 1;
    const values: (number | null)[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: (number | null)[] = [];
      for (let c = 0; c < columns; c++) {
        const value = sampler(startY + ry * r, startX + rx * c);
        row.push(Number.isNaN(value) ? null : round1(value));
      }
      values.push(row);
    }
    return {
      rx,
      ry,
      start_x: startX,
      start_y: startY,
      wrap_info: {
        info_type: 'model',
        base_time: this.baseTime,
        forecast_time: time,
        model: model.archiveName,
        param: wireParameter,
        pressure: pressureMb === null ? '-' : `MB${pressureMb}`,
        height: heightFeet === null ? '-' : heightFeet,
        direction_stack: true,
      },
      values,
    };
  }

  async airColumn(
    lat: number,
    lon: number,
    time: number,
    pressures: number[],
  ): Promise<AirLevelData[]> {
    const step = this.stepAt(time);
    const [t, u, v, gh, r] = await Promise.all(
      ['t', 'u', 'v', 'gh', 'r'].map((field) => this.fieldFile(field, step)),
    );
    return pressures.map((pressure) => {
      const level = this.manifest.pressures.indexOf(pressure);
      const at = (data: Int16Array, field: string) => this.sample(data, field, level, lat, lon);
      const temperature = round1(at(t, 't'));
      const humidity = at(r, 'r');
      const dewPoint = round1(dewpoint(temperature, Math.min(100, Math.max(1, humidity))));
      const windU = at(u, 'u');
      const windV = at(v, 'v');
      const vapor = saturationVaporPressure(dewPoint);
      return {
        pressure,
        modelHeight: round1(at(gh, 'gh')),
        standardHeight: round1(feetAtPressure(pressure) * 0.3048),
        temperature,
        windDir: Math.atan2(windV, windU),
        windStr: round1(Math.hypot(windU, windV) * KNOTS_PER_METER_PER_SECOND),
        dewPoint,
        rh: round1(humidity),
        ws: round1((622 * vapor) / (pressure - vapor)),
      };
    });
  }

  private async timeSampler(
    wireParameter: string,
    time: number,
    heightFeet: number | null,
    pressureMb: number | null,
  ): Promise<Sampler | null> {
    const hours = Math.min(this.lastStep, Math.max(0, msToHours(time - this.baseTime)));
    const before = Math.floor(hours / 3) * 3;
    const after = Math.min(this.lastStep, before + 3);
    const mix = after === before ? 0 : (hours - before) / 3;
    const [first, second] = await Promise.all([
      this.stepSampler(wireParameter, before, heightFeet, pressureMb),
      this.stepSampler(wireParameter, after, heightFeet, pressureMb),
    ]);
    if (!first || !second) return null;
    return (lat, lon) => first(lat, lon) * (1 - mix) + second(lat, lon) * mix;
  }

  private async stepSampler(
    wireParameter: string,
    step: number,
    heightFeet: number | null,
    pressureMb: number | null,
  ): Promise<Sampler | null> {
    if (pressureMb !== null) {
      const field = PRESSURE_FIELDS[wireParameter];
      const level = this.manifest.pressures.indexOf(pressureMb);
      if (!field || level < 0) return null;
      const data = await this.fieldFile(field, step);
      return (lat, lon) => this.sample(data, field, level, lat, lon);
    }
    if (!heightFeet) return this.surfaceSampler(wireParameter, step);
    const field = PRESSURE_FIELDS[wireParameter];
    if (!field) return null;
    const [data, heights] = await Promise.all([
      this.fieldFile(field, step),
      this.fieldFile('gh', step),
    ]);
    const meters = heightFeet * 0.3048;
    return (lat, lon) => {
      let below = this.sample(heights, 'gh', 0, lat, lon);
      if (meters <= below) return this.sample(data, field, 0, lat, lon);
      for (let level = 1; level < this.manifest.pressures.length; level++) {
        const above = this.sample(heights, 'gh', level, lat, lon);
        if (meters <= above) {
          const fraction = (meters - below) / (above - below);
          const low = this.sample(data, field, level - 1, lat, lon);
          return low + (this.sample(data, field, level, lat, lon) - low) * fraction;
        }
        below = above;
      }
      return NaN;
    };
  }

  private async surfaceSampler(wireParameter: string, step: number): Promise<Sampler | null> {
    if (wireParameter === 'SURFACE_RH' || wireParameter === 'RH') {
      const [temperatureField, dewpointField] = await Promise.all([
        this.fieldFile('2t', step),
        this.fieldFile('2d', step),
      ]);
      return (lat, lon) =>
        relativeHumidity(
          this.sample(temperatureField, '2t', 0, lat, lon),
          this.sample(dewpointField, '2d', 0, lat, lon),
        );
    }
    const field = SURFACE_FIELDS[wireParameter];
    if (!field) return null;
    const data = await this.fieldFile(field, step);
    return (lat, lon) => this.sample(data, field, 0, lat, lon);
  }

  private sample(data: Int16Array, field: string, level: number, lat: number, lon: number): number {
    const { west, south, resolution, columns, rows, fields, missing } = this.manifest;
    const x = Math.min(columns - 1, Math.max(0, (lon - west) / resolution));
    const y = Math.min(rows - 1, Math.max(0, (lat - south) / resolution));
    const x0 = Math.min(columns - 2, Math.floor(x));
    const y0 = Math.min(rows - 2, Math.floor(y));
    const fx = x - x0;
    const fy = y - y0;
    const offset = level * rows * columns + y0 * columns + x0;
    const corners = [data[offset], data[offset + 1], data[offset + columns], data[offset + columns + 1]];
    if (corners.includes(missing)) return NaN;
    const bottom = corners[0] * (1 - fx) + corners[1] * fx;
    const top = corners[2] * (1 - fx) + corners[3] * fx;
    return (bottom * (1 - fy) + top * fy) * fields[field].scale + fields[field].offset;
  }

  private stepAt(time: number): number {
    const hours = Math.min(this.lastStep, Math.max(0, msToHours(time - this.baseTime)));
    return Math.round(hours / 3) * 3;
  }

  private snapToData(edge: number, origin: number): number {
    const { resolution } = this.manifest;
    return origin + Math.ceil((edge - origin) / resolution - 1e-9) * resolution;
  }

  private fieldFile(field: string, step: number): Promise<Int16Array> {
    const name = `${field}-${String(step).padStart(3, '0')}.bin`;
    const cached = this.files.get(name);
    if (cached) {
      this.files.delete(name);
      this.files.set(name, cached);
      return cached;
    }
    const loading = fetch(`/fixtures/ecmwf/${name}`)
      .then((response) => response.arrayBuffer())
      .then((buffer) => new Int16Array(buffer));
    this.files.set(name, loading);
    if (this.files.size > CACHED_FILES) this.files.delete(this.files.keys().next().value!);
    return loading;
  }
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
