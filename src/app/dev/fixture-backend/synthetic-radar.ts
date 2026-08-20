import { RadarTimes } from '../../types/radar';
import { Wrap } from '../../types/wrap';
import { minutesToMs } from '../../utils/time';
import { SATELLITE_SECTORS, SOURCE_COUNT, sourceMixAt } from './synthetic-satellite';

const RADAR_SITES: Record<string, { center: [number, number]; span: number; stepMinutes: number }> = {
  center: { center: [34.9, 32.0], span: 1.6, stepMinutes: 3 },
  north: { center: [35.5, 33.1], span: 1.6, stepMinutes: 10 },
};

const CLOUD_SECTOR = SATELLITE_SECTORS['near'];
const SAMPLE_SIZE = 512;
const GRID_SIZE = 80;

let sourcesPromise: Promise<Uint8ClampedArray[]> | null = null;

export function radarTimes(start: number, end: number): RadarTimes[] {
  return Object.entries(RADAR_SITES).map(([name, site]) => {
    const step = minutesToMs(site.stepMinutes);
    const latest = Math.floor(Date.now() / step) * step;
    const times: number[] = [];
    for (let time = Math.ceil(start / step) * step; time <= end; time += step) {
      if (time <= latest) times.push(time);
    }
    return { name, times };
  });
}

export async function syntheticRadarWrap(radar: string, time: number): Promise<Wrap | null> {
  const site = RADAR_SITES[radar];
  if (!site) return null;
  const sources = await loadSources();
  const cloudStepMs = minutesToMs(CLOUD_SECTOR.stepMinutes);
  const slotTime = Math.round(time / cloudStepMs) * cloudStepMs;
  const { from, to, mix } = sourceMixAt(slotTime);
  const radius = (GRID_SIZE - 1) / 2;
  const [lon, lat] = site.center;
  const half = site.span / 2;
  const values: (number | null)[][] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    const cells: (number | null)[] = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      if (Math.hypot(col - radius, row - radius) > radius) {
        cells.push(null);
        continue;
      }
      const cellLon = lon - half + (col * site.span) / (GRID_SIZE - 1);
      const cellLat = lat + half - (row * site.span) / (GRID_SIZE - 1);
      cells.push(rainAt(sources[from], sources[to], mix, cellLon, cellLat));
    }
    values.push(cells);
  }
  return {
    rx: site.span / (GRID_SIZE - 1),
    ry: -site.span / (GRID_SIZE - 1),
    start_x: lon - half,
    start_y: lat + half,
    wrap_info: {
      base_time: time,
      forecast_time: time,
      model: 'radar',
      param: 'rain',
      pressure: null,
      height: null,
    },
    values,
  };
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
