import { Bounds } from '../../types/wrap';

export const SATELLITE_SECTORS: Record<string, { bounds: Bounds; size: number; stepMinutes: number }> = {
  near: { bounds: [30, 27, 40, 36], size: 1024, stepMinutes: 5 },
  wide: { bounds: [20, 18, 52, 44], size: 3000, stepMinutes: 15 },
};

const SOURCE_COUNT = 5;
const SOURCE_HOUR_MS = new Date(Date.now() - 86400000).setUTCHours(9, 0, 0, 0);

const sourcePromises = new Map<string, Promise<ImageBitmap>>();
const framePromises = new Map<string, Promise<Blob>>();

export function satelliteHours(sector: string, start: number, end: number): number[] {
  const step = (SATELLITE_SECTORS[sector]?.stepMinutes ?? 10) * 60_000;
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

async function renderFrame(sector: string, channel: string, time: number): Promise<Blob> {
  const { size, stepMinutes } = SATELLITE_SECTORS[sector] ?? SATELLITE_SECTORS['near'];
  const source = await loadSource(sector, Math.floor(time / (stepMinutes * 60_000)) % SOURCE_COUNT);
  const canvas = new OffscreenCanvas(size, size);
  const context = canvas.getContext('2d')!;
  if (channel === 'ir') context.filter = 'grayscale(1)';
  context.drawImage(source, 0, 0, size, size);
  return canvas.convertToBlob({ type: 'image/png' });
}

function loadSource(sector: string, index: number): Promise<ImageBitmap> {
  const key = `${sector}-${index}`;
  let source = sourcePromises.get(key);
  if (!source) {
    const { bounds, size } = SATELLITE_SECTORS[sector] ?? SATELLITE_SECTORS['near'];
    const [west, south, east, north] = bounds;
    const capture = new Date(SOURCE_HOUR_MS + index * 10 * 60000).toISOString();
    const url =
      'https://view.eumetsat.int/geoserver/wms?service=WMS&version=1.1.1&request=GetMap' +
      '&layers=mtg_fd:rgb_geocolour&styles=&srs=EPSG:4326&format=image/jpeg' +
      `&bbox=${west},${south},${east},${north}&width=${size}&height=${size}&time=${capture}`;
    source = fetch(url)
      .then((response) => response.blob())
      .then((blob) => createImageBitmap(blob));
    sourcePromises.set(key, source);
  }
  return source;
}
