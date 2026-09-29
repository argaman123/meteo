import { RadarEntity, RadarTimeRange } from '../../types/radar';
import { RadarWrapInfo, Wrap } from '../../types/wrap';
import { minutesToMs, msToSeconds, secondsToMs } from '../../utils/time';
import { SATELLITE_SOURCES, SOURCE_COUNT, sourceMixAt } from './synthetic-satellite';

const RADAR_SITES: Record<string, { center: [number, number]; span: number; stepMinutes: number }> = {
  CENTER: { center: [34.9, 32.0], span: 1.6, stepMinutes: 3 },
  NORTH: { center: [35.5, 33.1], span: 1.6, stepMinutes: 10 },
};

const CLOUD_SECTOR = SATELLITE_SOURCES['near'];
const SAMPLE_SIZE = 512;
const GRID_SIZE = 80;

let sourcesPromise: Promise<Uint8ClampedArray[]> | null = null;

export function radarTimeRange(start: number, end: number): RadarTimeRange {
  const entities = Object.entries(RADAR_SITES).flatMap(([name, site]) => {
    const step = minutesToMs(site.stepMinutes);
    const latest = Math.floor(Date.now() / step) * step;
    const siteEntities: RadarEntity[] = [];
    for (let time = Math.ceil(secondsToMs(start) / step) * step; time <= secondsToMs(end); time += step) {
      if (time > latest) continue;
      const seconds = msToSeconds(time);
      siteEntities.push({
        time: seconds,
        fileName: `${name}_${seconds}.xml`,
        radarName: name,
        radarType: 'RAIN',
        fileVersion: 1,
      });
    }
    return siteEntities;
  });
  return mapEntities(entities);
}

function mapEntities(entities: RadarEntity[]): RadarTimeRange {
  const times = [...new Set(entities.map((entity) => entity.time))].sort((a, b) => a - b);
  const radars = [...new Set(entities.map((entity) => entity.radarName))];
  const result: RadarTimeRange = {};
  let lastKey = '';
  for (const time of times) {
    const current = radars.flatMap((radar) => {
      const nearest = entities
        .filter((entity) => entity.radarName === radar)
        .reduce<RadarEntity | null>(
          (best, entity) =>
            best === null || Math.abs(time - entity.time) < Math.abs(time - best.time) ? entity : best,
          null,
        );
      return nearest && Math.abs(time - nearest.time) < 5 * 60 ? [nearest] : [];
    });
    const key = JSON.stringify(current);
    if (key !== lastKey) {
      result[String(time)] = current;
      lastKey = key;
    }
  }
  return result;
}

export async function syntheticRadarWrap(entity: RadarEntity): Promise<Wrap<RadarWrapInfo> | null> {
  const site = RADAR_SITES[entity.radarName];
  if (!site) return null;
  const sources = await loadSources();
  const cloudStepMs = minutesToMs(CLOUD_SECTOR.stepMinutes);
  const slotTime = Math.round(secondsToMs(entity.time) / cloudStepMs) * cloudStepMs;
  const { from, to, mix } = sourceMixAt(slotTime);
  const radius = (GRID_SIZE - 1) / 2;
  const [lon, lat] = site.center;
  const half = site.span / 2;
  const values: number[][] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    const cells: number[] = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      const distance = Math.hypot(col - radius, row - radius);
      if (distance > radius) {
        cells.push(0);
        continue;
      }
      const cellLon = lon - half + (col * site.span) / (GRID_SIZE - 1);
      const cellLat = lat - half + (row * site.span) / (GRID_SIZE - 1);
      cells.push(distance < 6 ? -clutterAt(row, col) : rainAt(sources[from], sources[to], mix, cellLon, cellLat));
    }
    values.push(cells);
  }
  return {
    rx: site.span / (GRID_SIZE - 1),
    ry: site.span / (GRID_SIZE - 1),
    start_x: lon - half,
    start_y: lat - half,
    wrap_info: { info_type: 'radar', name: entity.radarName, time: entity.time, type: entity.radarType },
    values,
  };
}

function clutterAt(row: number, col: number): number {
  const scrambled = Math.sin(row * 12.9898 + col * 78.233) * 43758.5453;
  const fraction = scrambled - Math.floor(scrambled);
  return fraction < 0.5 ? 0 : Number((fraction * 6).toFixed(1));
}

function rainAt(
  from: Uint8ClampedArray,
  to: Uint8ClampedArray,
  mix: number,
  lon: number,
  lat: number,
): number {
  const movingCloud = (1 - mix) * movingCloudAt(from, lon, lat) + mix * movingCloudAt(to, lon, lat);
  if (movingCloud < 0.06) return 0;
  const strength = Math.min(1, (movingCloud - 0.06) / 0.3);
  return Number((Math.pow(strength, 1.5) * 9).toFixed(1));
}

function movingCloudAt(source: Uint8ClampedArray, lon: number, lat: number): number {
  const [west, south, east, north] = CLOUD_SECTOR.bounds;
  const x = Math.round(((lon - west) / (east - west)) * (SAMPLE_SIZE - 1));
  const y = Math.round(((north - lat) / (north - south)) * (SAMPLE_SIZE - 1));
  let sum = 0;
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (px < 0 || py < 0 || px >= SAMPLE_SIZE || py >= SAMPLE_SIZE) continue;
      sum += source[py * SAMPLE_SIZE + px];
      count++;
    }
  }
  return sum / count / 255;
}

function loadSources(): Promise<Uint8ClampedArray[]> {
  sourcesPromise ??= Promise.all(
    Array.from({ length: SOURCE_COUNT }, async (_, index) => {
      const blob = await fetch(`/fixtures/satellite/near-${index}.jpg`).then((response) =>
        response.blob(),
      );
      const bitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(SAMPLE_SIZE, SAMPLE_SIZE);
      const context = canvas.getContext('2d')!;
      context.drawImage(bitmap, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
      const data = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
      const cloudiness = new Uint8ClampedArray(SAMPLE_SIZE * SAMPLE_SIZE);
      for (let pixel = 0; pixel < cloudiness.length; pixel++) {
        const offset = pixel * 4;
        cloudiness[pixel] = Math.min(data[offset], data[offset + 1], data[offset + 2]);
      }
      return cloudiness;
    }),
  ).then(subtractStillGround);
  return sourcesPromise;
}

function subtractStillGround(frames: Uint8ClampedArray[]): Uint8ClampedArray[] {
  const stillGround = frames[0].map((_, pixel) =>
    Math.min(...frames.map((frame) => frame[pixel])),
  );
  const background = stillGround.map((_, pixel) => {
    const x = pixel % SAMPLE_SIZE;
    const y = (pixel - x) / SAMPLE_SIZE;
    let brightest = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (px < 0 || py < 0 || px >= SAMPLE_SIZE || py >= SAMPLE_SIZE) continue;
        brightest = Math.max(brightest, stillGround[py * SAMPLE_SIZE + px]);
      }
    }
    return brightest;
  });
  return frames.map((frame) => frame.map((cloud, pixel) => cloud - background[pixel]));
}
