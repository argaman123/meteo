import { SatImage, SatelliteChannel, SatelliteSector, SatelliteSectors } from '../../types/satellite';
import { Bounds } from '../../types/wrap';
import { minutesToMs, msToSeconds, secondsToMs } from '../../utils/time';

export const SATELLITE_SOURCES: Record<string, { bounds: Bounds; size: number; stepMinutes: number }> = {
  near: { bounds: [30, 27, 40, 36], size: 1024, stepMinutes: 5 },
  wide: { bounds: [20, 18, 52, 44], size: 3000, stepMinutes: 15 },
};

const SECTOR_BOUNDS: Record<SatelliteSector, Bounds> = {
  modeq: [-6.085, 17.048, 51.915, 50.048],
  noaeq: [23.973, 25.007, 42.988, 40.025],
  naseq: [28.002, 10.965, 62.036, 43.001],
  srneq: [28.75, -8.98, 71.75, 38.07],
};

const IMAGE_SIZE = 1024;

export const SOURCE_COUNT = 19;

const sourcePromises = new Map<string, Promise<ImageBitmap>>();
const framePromises = new Map<string, Promise<Blob>>();

export function satelliteSectors(): SatelliteSectors[] {
  const entries = Object.fromEntries(
    Object.entries(SECTOR_BOUNDS).map(([sector, [west, south, east, north]]) => [
      sector,
      [{ date: '2024-01-01', coords: { west, south, east, north } }],
    ]),
  );
  return [
    { id: '8', ...entries },
    { id: '9', ...entries },
  ];
}

export function satImages(
  start: number,
  end: number,
  source: string,
  sector: string,
  satelliteId: number,
): SatImage[] {
  const step = minutesToMs(sector === 'noaeq' ? 5 : 15);
  const latest = Math.floor(Date.now() / step) * step;
  const images: SatImage[] = [];
  for (let time = Math.ceil(secondsToMs(start) / step) * step; time <= secondsToMs(end); time += step) {
    if (time > latest) continue;
    images.push({
      imgTime: msToSeconds(time),
      satelliteType: 'METEOSAT',
      satelliteId,
      satelliteSector: sector,
      satelliteSource: source,
      fileName: `${sector}_${source}_${msToSeconds(time)}.xml`,
      channel_number: 0,
      current_channel: 0,
    });
  }
  return images;
}

export function syntheticSatelliteImage(fileName: string): Promise<Blob> {
  let frame = framePromises.get(fileName);
  if (!frame) {
    const [sector, source, seconds] = fileName.replace('.xml', '').split('_');
    frame = renderFrame(sector as SatelliteSector, source, secondsToMs(Number(seconds)));
    framePromises.set(fileName, frame);
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

async function renderFrame(sector: SatelliteSector, source: string, time: number): Promise<Blob> {
  const [west, south, east, north] = SECTOR_BOUNDS[sector] ?? SECTOR_BOUNDS.noaeq;
  const { from, to, mix } = sourceMixAt(time);
  const canvas = new OffscreenCanvas(IMAGE_SIZE, IMAGE_SIZE);
  const context = canvas.getContext('2d')!;
  context.fillStyle = 'black';
  context.fillRect(0, 0, IMAGE_SIZE, IMAGE_SIZE);
  if (source === SatelliteChannel.IR10_8) context.filter = 'grayscale(1)';
  for (const name of ['wide', 'near']) {
    const [sourceWest, sourceSouth, sourceEast, sourceNorth] = SATELLITE_SOURCES[name].bounds;
    const x = ((sourceWest - west) / (east - west)) * IMAGE_SIZE;
    const y = ((north - sourceNorth) / (north - south)) * IMAGE_SIZE;
    const width = ((sourceEast - sourceWest) / (east - west)) * IMAGE_SIZE;
    const height = ((sourceNorth - sourceSouth) / (north - south)) * IMAGE_SIZE;
    context.globalAlpha = 1;
    context.drawImage(await loadSource(name, from), x, y, width, height);
    if (mix > 0.01) {
      context.globalAlpha = mix;
      context.drawImage(await loadSource(name, to), x, y, width, height);
    }
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
