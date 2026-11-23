import { BirdDetection } from '../../types/birds';
import { RadarEntity, RadarTimeRange } from '../../types/radar';
import { RadarWrapInfo, Wrap } from '../../types/wrap';
import { minutesToMs, msToSeconds, secondsToMs } from '../../utils/time';
import { mapEntities } from './synthetic-radar';

const BIRD_RADARS: Record<string, { center: [number, number]; stepMinutes: number }> = {
  meron: { center: [35.42, 33.0], stepMinutes: 5 },
  merged: { center: [34.82, 32.0], stepMinutes: 5 },
  ramon: { center: [34.8, 30.6], stepMinutes: 5 },
  eilat: { center: [34.95, 29.55], stepMinutes: 10 },
};

const RANGE = 0.6;
const GRID_SIZE = 80;
const FEET_PER_METER = 3.28084;

const CORRIDORS: [number, number][][] = [
  [
    [35.62, 33.4],
    [35.57, 32.6],
    [35.52, 31.8],
    [35.42, 31.0],
    [35.18, 30.3],
    [34.98, 29.4],
  ],
  [
    [35.15, 33.2],
    [34.88, 32.5],
    [34.62, 31.8],
    [34.48, 31.3],
    [34.62, 30.6],
    [34.9, 29.4],
  ],
];

interface Flock {
  corridor: number;
  phase: number;
  offset: number;
  speed: number;
  height: number;
  size: number;
}

const FLOCKS: Flock[] = CORRIDORS.flatMap((_, corridor) =>
  Array.from({ length: 45 }, (_, index) => {
    const seed = corridor * 1000 + index;
    return {
      corridor,
      phase: noise(seed, 1),
      offset: (noise(seed, 2) + noise(seed, 3) - 1) * 0.2,
      speed: 0.006 + noise(seed, 4) * 0.003,
      height: 500 + Math.pow(noise(seed, 5), 1.4) * 4500,
      size: 1 + Math.floor(noise(seed, 6) * 3),
    };
  }),
);

export function birdDetections(start: number, end: number): BirdDetection[][] {
  return Object.entries(BIRD_RADARS).flatMap(([radar, site]) =>
    fileTimes(site.stepMinutes, start, end).map((time) => [
      ...birdsAt(time)
        .filter((bird) => inRange(site.center, bird.lon, bird.lat))
        .map((bird) => ({
          coords: [[bird.lon, bird.lat]] as [[number, number]],
          params: [{ name: 'height', value: String(bird.height) }],
          radar,
          obsTime: time,
        })),
      {
        coords: [[0, 0]] as [[number, number]],
        params: [{ name: 'height', value: '-1' }],
        radar,
        obsTime: time,
      },
    ]),
  );
}

export function birdRadarTimeRange(start: number, end: number): RadarTimeRange {
  return mapEntities(
    Object.entries(BIRD_RADARS).flatMap(([radar, site]) =>
      fileTimes(site.stepMinutes, secondsToMs(start), secondsToMs(end)).map((time) => ({
        time: msToSeconds(time),
        fileName: `${radarName(radar)}_${msToSeconds(time)}.xml`,
        radarName: radarName(radar),
        radarType: 'BIRD',
        fileVersion: 3,
      })),
    ),
  );
}

export function syntheticBirdRadarWrap(entity: RadarEntity): Wrap<RadarWrapInfo> | null {
  const radar = Object.keys(BIRD_RADARS).find((name) => radarName(name) === entity.radarName);
  if (!radar) return null;
  const [lon, lat] = BIRD_RADARS[radar].center;
  const time = secondsToMs(entity.time);
  const step = (2 * RANGE) / (GRID_SIZE - 1);
  const center = (GRID_SIZE - 1) / 2;
  const values = Array.from({ length: GRID_SIZE }, (_, row) =>
    Array.from({ length: GRID_SIZE }, (_, col) =>
      clutterAt(row * GRID_SIZE + col, Math.hypot(col - center, row - center) * step, entity.time),
    ),
  );
  for (const bird of birdsAt(time)) {
    const col = Math.round((bird.lon - lon + RANGE) / step);
    const row = Math.round((bird.lat - lat + RANGE) / step);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const r = row + dy;
        const c = col + dx;
        if (r < 0 || c < 0 || r >= GRID_SIZE || c >= GRID_SIZE) continue;
        if ((dx !== 0 || dy !== 0) && noise(r * GRID_SIZE + c, entity.time) < 0.5) continue;
        values[r][c] = Math.max(values[r][c], Math.round(bird.height / FEET_PER_METER));
      }
    }
  }
  const radius = (GRID_SIZE - 1) / 2;
  values.forEach((cells, row) =>
    cells.forEach((_, col) => {
      if (Math.hypot(col - radius, row - radius) > radius) cells[col] = 0;
    }),
  );
  return {
    rx: step,
    ry: step,
    start_x: lon - RANGE,
    start_y: lat - RANGE,
    wrap_info: {
      info_type: 'radar',
      name: entity.radarName,
      time: entity.time,
      type: entity.radarType,
    },
    values,
  };
}

function birdsAt(time: number): { lon: number; lat: number; height: number }[] {
  const minutes = time / minutesToMs(1);
  return FLOCKS.flatMap((flock, index) => {
    const corridor = CORRIDORS[flock.corridor];
    const along = (flock.phase + (flock.speed * minutes) / corridorLength(corridor)) % 1;
    const [lon, lat, east, north] = pointAlong(corridor, along);
    const centerLon = lon + north * flock.offset;
    const centerLat = lat - east * flock.offset;
    const climb = 300 * Math.sin(minutes / 40 + index);
    return Array.from({ length: flock.size }, (_, bird) => ({
      lon: Number((centerLon + (noise(index * 10 + bird, 7) - 0.5) * 0.04).toFixed(4)),
      lat: Number((centerLat + (noise(index * 10 + bird, 8) - 0.5) * 0.04).toFixed(4)),
      height: Math.round(
        Math.max(150, flock.height + climb + (noise(index * 10 + bird, 9) - 0.5) * 400),
      ),
    }));
  });
}

function clutterAt(cell: number, distance: number, time: number): number {
  const chance = 0.7 * Math.exp(-distance / 0.06);
  const steady = noise(cell, 11) < chance;
  const flicker = noise(cell, time) < chance * 0.4;
  if (!steady && !flicker) return 0;
  return Math.round(20 + noise(cell, 12) * 120);
}

function fileTimes(stepMinutes: number, start: number, end: number): number[] {
  const step = minutesToMs(stepMinutes);
  const times: number[] = [];
  for (let time = Math.ceil(start / step) * step; time <= Math.min(end, Date.now()); time += step) {
    times.push(time);
  }
  return times;
}

function inRange([centerLon, centerLat]: [number, number], lon: number, lat: number): boolean {
  return Math.hypot(lon - centerLon, lat - centerLat) <= RANGE;
}

function radarName(radar: string): string {
  return `${radar.toUpperCase()}_BIRD`;
}

function corridorLength(corridor: [number, number][]): number {
  let length = 0;
  for (let i = 1; i < corridor.length; i++) {
    length += Math.hypot(corridor[i][0] - corridor[i - 1][0], corridor[i][1] - corridor[i - 1][1]);
  }
  return length;
}

function pointAlong(
  corridor: [number, number][],
  fraction: number,
): [number, number, number, number] {
  let remaining = fraction * corridorLength(corridor);
  for (let i = 1; i < corridor.length; i++) {
    const [fromLon, fromLat] = corridor[i - 1];
    const [toLon, toLat] = corridor[i];
    const length = Math.hypot(toLon - fromLon, toLat - fromLat);
    if (remaining <= length || i === corridor.length - 1) {
      const t = Math.min(1, remaining / length);
      return [
        fromLon + (toLon - fromLon) * t,
        fromLat + (toLat - fromLat) * t,
        (toLon - fromLon) / length,
        (toLat - fromLat) / length,
      ];
    }
    remaining -= length;
  }
  return [...corridor[0], 0, -1];
}

function noise(seed: number, salt: number): number {
  const scrambled = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return scrambled - Math.floor(scrambled);
}
