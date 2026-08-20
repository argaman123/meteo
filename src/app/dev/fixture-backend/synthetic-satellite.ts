import { Bounds } from '../../types/wrap';
import { minutesToMs } from '../../utils/time';

export const SATELLITE_SECTORS: Record<string, { bounds: Bounds; size: number; stepMinutes: number }> = {
  near: { bounds: [30, 27, 40, 36], size: 1024, stepMinutes: 5 },
  wide: { bounds: [20, 18, 52, 44], size: 3000, stepMinutes: 15 },
};

export const SOURCE_COUNT = 19;

const sourcePromises = new Map<string, Promise<ImageBitmap>>();
const framePromises = new Map<string, Promise<Blob>>();

export function satelliteHours(sector: string, start: number, end: number): number[] {
  const step = minutesToMs(SATELLITE_SECTORS[sector]?.stepMinutes ?? 10);
  const latest = Math.floor(Date.now() / step) * step;
  const times: number[] = [];
  for (let time = Math.ceil(start / step) * step; time <= end; time += step) {
    if (time <= latest) times.push(time);
  }
  return times;
}

export function syntheticSatelliteImage(sector: string, channel: string, time: number): Promise<Blob> {
  const key = `${sector}-${channel}-${time}`;
  let frame = framePromises.get(key);
  if (!frame) {
    frame = renderFrame(sector, channel, time);
    framePromises.set(key, frame);
  }
  return frame;
}

const ANCHOR_INDEX = 12;
const SEQUENCE_STEP_MINUTES = 10;
const SEQUENCE_EPOCH = Date.now();

export function sourceMixAt(time: number): { from: number; to: number; mix: number } {
  const position = Math.min(
    SOURCE_COUNT - 1,
    Math.max(0, ANCHOR_INDEX + (time - SEQUENCE_EPOCH) / minutesToMs(SEQUENCE_STEP_MINUTES)),
  );
  const from = Math.floor(position);
  const to = Math.min(SOURCE_COUNT - 1, from + 1);
  return { from, to, mix: position - from };
}

async function renderFrame(sector: string, channel: string, time: number): Promise<Blob> {
  const { size } = SATELLITE_SECTORS[sector] ?? SATELLITE_SECTORS['near'];
  const { from, to, mix } = sourceMixAt(time);
  const canvas = new OffscreenCanvas(size, size);
  const context = canvas.getContext('2d')!;
  if (channel === 'ir') context.filter = 'grayscale(1)';
  context.drawImage(await loadSource(sector, from), 0, 0, size, size);
  if (mix > 0.01) {
    context.globalAlpha = mix;
    context.drawImage(await loadSource(sector, to), 0, 0, size, size);
  }
  return canvas.convertToBlob({ type: 'image/png' });
}

function loadSource(sector: string, index: number): Promise<ImageBitmap> {
  const key = `${sector}-${index}`;
  let source = sourcePromises.get(key);
  if (!source) {
    source = fetch(`/fixtures/satellite/${sector}-${index}.jpg`)
      .then((response) => response.blob())
      .then((blob) => createImageBitmap(blob));
    sourcePromises.set(key, source);
  }
  return source;
}
