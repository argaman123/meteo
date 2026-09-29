import { AirLevelData } from '../../types/sounding';
import { Bounds, ModelWrapInfo, Wrap } from '../../types/wrap';
import { feetAtPressure, relativeHumidity } from '../../utils/thermodynamics';
import { hoursToMs } from '../../utils/time';

interface Model {
  name: string;
  archiveName: string;
  north: number;
  west: number;
  south: number;
  east: number;
}

const MODELS: Model[] = [
  { name: 'BIG_ECMWF', archiveName: 'ECMWF03', north: 60, west: -10, south: 20, east: 60 },
  { name: 'ECMWF', archiveName: 'ECMWF01', north: 52, west: 0, south: 24, east: 50 },
];

const FIELDS: Record<string, string> = {
  TMP: 'temperature',
  SURFACE_TMP: 'temperature',
  U: 'u',
  V: 'v',
  HGT: 'hgt',
};

const RESPONSE_SIZE = 70;
const KNOTS_PER_METER_PER_SECOND = 1.94384;

interface GfsRecord {
  header: { nx: number; ny: number; lo1: number; la1: number; dx: number; dy: number };
  data: number[];
}

export interface LandPolygon {
  rings: number[][][];
  west: number;
  south: number;
  east: number;
  north: number;
}

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

export class SyntheticWeather {
  private readonly wind: { u: GfsRecord; v: GfsRecord } | null;
  private readonly land: LandPolygon[];

  constructor(gfsRecords: unknown, landGeojson: unknown) {
    this.wind = findWindRecords(gfsRecords);
    this.land = collectLandPolygons(landGeojson);
  }

  wrap(
    modelName: string,
    wireParameter: string,
    bounds: Bounds,
    hours: number,
    runTime: number,
    heightFeet: number | null = null,
    pressureMb: number | null = null,
  ): Wrap<ModelWrapInfo> | null {
    const model = MODELS.find((candidate) => candidate.name === modelName);
    const parameter = FIELDS[wireParameter];
    if (!model || !parameter) return null;
    const west = Math.max(bounds[0], model.west);
    const east = Math.min(bounds[2], model.east);
    const south = Math.max(bounds[1], model.south);
    const north = Math.min(bounds[3], model.north);
    if (west >= east || south >= north) return null;
    const maskWaves = isWave(parameter);
    const effectiveFeet = pressureMb === null ? (heightFeet ?? 0) : feetAtPressure(pressureMb);
    const values: (number | null)[][] = [];
    for (let r = 0; r < RESPONSE_SIZE; r++) {
      const lat = south + ((north - south) * r) / (RESPONSE_SIZE - 1);
      const row: (number | null)[] = [];
      for (let c = 0; c < RESPONSE_SIZE; c++) {
        const lon = west + ((east - west) * c) / (RESPONSE_SIZE - 1);
        row.push(
          maskWaves && isLand(this.land, lat, lon)
            ? null
            : this.field(lat, lon, hours, parameter, effectiveFeet, pressureMb),
        );
      }
      values.push(row);
    }
    return {
      rx: (east - west) / (RESPONSE_SIZE - 1),
      ry: (north - south) / (RESPONSE_SIZE - 1),
      start_x: west,
      start_y: south,
      wrap_info: {
        info_type: 'model',
        base_time: runTime,
        forecast_time: runTime + hoursToMs(hours),
        model: model.archiveName,
        param: wireParameter,
        pressure: pressureMb === null ? '-' : `MB${pressureMb}`,
        height: heightFeet === null ? '-' : heightFeet,
        direction_stack: true,
      },
      values,
    };
  }

  airColumn(lat: number, lon: number, hours: number, pressures: number[]): AirLevelData[] {
    return pressures.map((pressure) => {
      const feet = feetAtPressure(pressure);
      const value = (parameter: string) => this.field(lat, lon, hours, parameter, feet, pressure);
      const temperature = value('temperature');
      const dewPoint = value('dewpoint');
      const u = value('u');
      const v = value('v');
      const vapor = 6.112 * Math.exp((17.67 * dewPoint) / (dewPoint + 243.5));
      return {
        pressure,
        modelHeight: value('hgt'),
        standardHeight: round1(feet * 0.3048),
        temperature,
        windDir: Math.atan2(v, u),
        windStr: round1(Math.hypot(u, v) * KNOTS_PER_METER_PER_SECOND),
        dewPoint,
        rh: round1(relativeHumidity(temperature, dewPoint)),
        ws: round1((622 * vapor) / (pressure - vapor)),
      };
    });
  }

  private field(
    lat: number,
    lon: number,
    hours: number,
    parameter: string,
    heightFeet: number,
    pressureMb: number | null,
  ): number {
    if (parameter === 'waveHeight') return round1(waveHeightAt(lat, lon, hours));
    if (parameter === 'temperature') {
      return round1(temperatureAt(lat, lon, hours) - heightFeet * 0.002);
    }
    if (parameter === 'dewpoint') {
      return round1(
        temperatureAt(lat, lon, hours) -
          heightFeet * 0.002 -
          dewpointDepressionAt(lat, lon, hours, heightFeet),
      );
    }
    if (parameter === 'hgt') {
      if (pressureMb === null) return round1(8 * (pressureAt(lat, lon, hours) - 1000));
      const thickness = 1 + (temperatureAt(lat, lon, hours) - 15) / 288;
      return round1(heightFeet * 0.3048 * thickness + 8 * (pressureAt(lat, lon, hours) - 1013));
    }
    const wind = this.windAt(lat, lon, hours);
    const speedKnots = wind.speedKnots * (1 + (heightFeet / 10000) * 0.6);
    const radians = ((wind.directionDegrees + (heightFeet / 1000) * 2) * Math.PI) / 180;
    if (parameter === 'windSpeed') return round1(speedKnots);
    if (parameter === 'waveU' || parameter === 'waveV') {
      const height = waveHeightAt(lat, lon, hours);
      return round1(
        parameter === 'waveU' ? -height * Math.sin(radians) : -height * Math.cos(radians),
      );
    }
    const speedMs = speedKnots / KNOTS_PER_METER_PER_SECOND;
    return round1(parameter === 'u' ? -speedMs * Math.sin(radians) : -speedMs * Math.cos(radians));
  }

  private windAt(
    lat: number,
    lon: number,
    hours: number,
  ): { speedKnots: number; directionDegrees: number } {
    if (this.wind) {
      const driftedLon = lon - 0.4 * hours;
      const u = sampleGfs(this.wind.u, lat, driftedLon);
      const v = sampleGfs(this.wind.v, lat, driftedLon);
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
    return {
      speedKnots: Math.min(65, Math.hypot(u, v)),
      directionDegrees: ((Math.atan2(-u, -v) * 180) / Math.PI + 360) % 360,
    };
  }

}

function isWave(parameter: string): boolean {
  return parameter === 'waveHeight' || parameter === 'waveU' || parameter === 'waveV';
}

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

function temperatureAt(lat: number, lon: number, hours: number): number {
  const jet = jetLatitude(lon, hours);
  const latitudinal = 34 - 0.7 * (lat - 20);
  const baroclinic = 5 * Math.tanh((jet - lat) / 8);
  const regionalTexture = 1.5 * Math.sin(lon / 6 + 1) * Math.cos(lat / 4.5);
  const diurnal = 2 * Math.sin(((hours - 3) / 24) * 2 * Math.PI);
  return latitudinal + baroclinic + regionalTexture + diurnal;
}

function dewpointDepressionAt(lat: number, lon: number, hours: number, heightFeet: number): number {
  const surface = 6 + 5 * Math.sin(lon / 5 + hours / 10) * Math.cos(lat / 4);
  const moistLayer =
    8 *
    Math.exp(-(((heightFeet - 14000) / 5000) ** 2)) *
    (0.5 + 0.5 * Math.sin(lat / 3 - hours / 8));
  return Math.max(0.5, surface + heightFeet * 0.0004 - moistLayer);
}

function waveHeightAt(lat: number, lon: number, hours: number): number {
  const jet = jetLatitude(lon, hours);
  const swell = 1.6 + 1.4 * Math.sin(lon / 15 + hours / 12) * Math.cos(lat / 20);
  const storm = 1.8 * Math.exp(-Math.abs(lat - jet) / 6);
  return Math.max(0, swell + storm);
}

function sampleGfs(record: GfsRecord, lat: number, lon: number): number {
  const { nx, ny, lo1, la1, dx, dy } = record.header;
  const col = ((((lon - lo1) / dx) % nx) + nx) % nx;
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

function findWindRecords(gfsRecords: unknown): { u: GfsRecord; v: GfsRecord } | null {
  const records = gfsRecords as (GfsRecord & { header: { parameterNumber: number } })[];
  const u = records.find((record) => record.header.parameterNumber === 2);
  const v = records.find((record) => record.header.parameterNumber === 3);
  return u && v ? { u, v } : null;
}

export function isLand(land: LandPolygon[], lat: number, lon: number): boolean {
    for (const polygon of land) {
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

export function collectLandPolygons(landGeojson: unknown): LandPolygon[] {
  const geojson = landGeojson as {
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

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
