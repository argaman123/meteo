import { SECTORS } from '../../layers/polygons/polygons-layer';
import { VISIBILITY_BANDS } from '../../layers/polygons/visibility';
import { CloudEvent, PolygonsWrap, Sector } from '../../types/polygons';

export function syntheticPolygons(
  sector: Sector,
  frameHours: number,
  runTime: number,
): PolygonsWrap | null {
  const bounds = SECTORS[sector];
  if (!bounds || frameHours < 0 || frameHours > 96) return null;
  const polygons: PolygonsWrap['polygons'] = [
    highCloud(frameHours),
    midCloud(frameHours),
    lowCloud(frameHours),
    surfaceHaze(frameHours),
  ];
  if (Math.sin(frameHours / 5) > 0) polygons.push(highHaze(frameHours));
  if (frameHours % 24 < 9) polygons.push(fogPatch(frameHours));
  const center = SECTORS[Sector.Center];
  for (const shape of polygons) {
    for (const point of shape.coordinates) {
      point[0] += bounds[1] - center[1];
      point[1] += bounds[0] - center[0];
    }
    shape.coordinates.push(shape.coordinates[0]);
  }
  return {
    startTime: runTime + (frameHours - 1) * 3600,
    endTime: runTime + (frameHours + 2) * 3600,
    sector,
    polygons,
  };
}

function lowCloud(frameHours: number): PolygonsWrap['polygons'][number] {
  const east = 34.6 + 0.3 * Math.sin(frameHours / 4);
  const event: CloudEvent = {
    type: 'cloud',
    baseFt: 1500,
    topFt: 3000 + 500 * Math.round(Math.sin(frameHours / 6) * 2),
    eights: 3 + (Math.round(frameHours / 3) % 5),
  };
  if (Math.sin(frameHours / 4) > -0.4) {
    event.precip = {
      level: 1 + (Math.round(frameHours / 3) % 4),
      probability: 30 + (frameHours % 5) * 10,
    };
    if (frameHours % 12 >= 6) {
      const types = ['scattered', 'cb', 'cloudy'] as const;
      event.precip.cb = {
        cbType: types[Math.round(frameHours / 3) % 3],
        severity: ((frameHours / 3) % 4) / 3,
      };
    }
  }
  return {
    coordinates: [
      [30.3, 31.6],
      [30.1, east],
      [31.4, east + 0.7],
      [32.4, east - 0.3],
      [32.1, 31.8],
    ],
    forecastEvents: [event],
  };
}

function midCloud(frameHours: number): PolygonsWrap['polygons'][number] {
  const west = 33.6 + 0.25 * Math.cos(frameHours / 5);
  return {
    coordinates: [
      [30.6, west],
      [30.9, west + 2.6],
      [32.6, west + 2.2],
      [32.2, west - 0.4],
    ],
    forecastEvents: [
      {
        type: 'cloud',
        baseFt: 10000,
        topFt: 18000,
        eights: 2 + (Math.round(frameHours / 3) % 6),
      },
    ],
  };
}

function highCloud(frameHours: number): PolygonsWrap['polygons'][number] {
  const east = 34.72 + 0.3 * Math.sin(frameHours / 4);
  return {
    coordinates: [
      [30.42, 31.72],
      [30.22, east],
      [31.52, east + 0.7],
      [32.52, east - 0.3],
      [32.22, 31.92],
    ],
    forecastEvents: [
      {
        type: 'cloud',
        baseFt: 25000,
        topFt: 32000,
        eights: 1 + (Math.round(frameHours / 3) % 7),
      },
    ],
  };
}

function surfaceHaze(frameHours: number): PolygonsWrap['polygons'][number] {
  const north = 30.6 + 0.2 * Math.sin(frameHours / 6);
  return {
    coordinates: [
      [29.2, 32.4],
      [29.3, 35.9],
      [north, 35.5],
      [north - 0.1, 32.8],
    ],
    forecastEvents: [
      {
        type: 'haze',
        height: 'surface',
        ...VISIBILITY_BANDS[(1 + Math.round(frameHours / 3)) % VISIBILITY_BANDS.length],
      },
    ],
  };
}

function highHaze(frameHours: number): PolygonsWrap['polygons'][number] {
  return {
    coordinates: [
      [31.9, 34.9],
      [32.1, 36.2],
      [33.2, 36.0],
      [33.1, 34.6],
    ],
    forecastEvents: [
      {
        type: 'haze',
        height: 'high',
        ...VISIBILITY_BANDS[Math.round(frameHours / 3) % VISIBILITY_BANDS.length],
      },
    ],
  };
}

function fogPatch(frameHours: number): PolygonsWrap['polygons'][number] {
  const size = 0.35 + 0.1 * Math.sin(frameHours / 2);
  const band = VISIBILITY_BANDS[Math.round(frameHours / 3) % VISIBILITY_BANDS.length];
  return {
    coordinates: [
      [32.5 - size, 33.6 - size],
      [32.5 - size, 33.6 + size],
      [32.5 + size, 33.6 + size],
      [32.5 + size, 33.6 - size],
    ],
    forecastEvents: [{ type: 'fog', minVis: band.minVis, maxVis: band.maxVis }],
  };
}
