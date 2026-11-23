import { SECTORS } from '../../layers/polygons/polygons-layer';
import { VISIBILITY_BANDS } from '../../layers/polygons/visibility';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { polygon } from '@turf/helpers';
import {
  CloudEvent,
  Eights,
  ForecastPolygon,
  PointEvents,
  PolygonsState,
  PolygonsStatus,
  PrecipType,
  Sector,
} from '../../types/polygons';
import { hoursToMs } from '../../utils/time';

const SCENE_ORIGIN = { lon: 32, lat: 29.5 };
const EIGHTS: Eights[] = ['E0', 'E02', 'E13', 'E24', 'E35', 'E46', 'E57', 'E68', 'E8'];
const RAIN_TYPES: PrecipType[] = [
  'VIRGOT',
  'DRIPPING',
  'DRIPPING_MEDIUM_RAIN',
  'MEDIUM_RAIN',
  'MEDIUM_HIGH_RAIN',
  'HEAVY_RAIN',
];

export function syntheticPolygons(
  sector: Sector,
  frameHours: number,
  runTime: number,
): PolygonsState | null {
  const bounds = SECTORS[sector];
  if (!bounds || frameHours < 0 || frameHours > 96) return null;
  const polygons: ForecastPolygon[] = [
    highCloud(frameHours),
    midCloud(frameHours),
    lowCloud(frameHours),
    surfaceHaze(frameHours),
  ];
  if (Math.sin(frameHours / 5) > 0) polygons.push(highHaze(frameHours));
  if (frameHours % 24 < 9) polygons.push(fogPatch(frameHours));
  for (const shape of polygons) {
    for (const point of shape.coordinates) {
      point[0] += bounds[0] - SCENE_ORIGIN.lon;
      point[1] += bounds[1] - SCENE_ORIGIN.lat;
    }
    shape.coordinates.push(shape.coordinates[0]);
  }
  const time = runTime + hoursToMs(frameHours);
  return {
    startTime: time,
    endTime: time,
    sector,
    status: PolygonsStatus.Distributed,
    timeEdited: runTime,
    polygons,
  };
}

export function syntheticPointEvents(
  sector: Sector,
  lon: number,
  lat: number,
  frameHours: number[],
  runTime: number,
): PointEvents[] {
  return frameHours.flatMap((hours) => {
    const state = syntheticPolygons(sector, hours, runTime);
    if (!state) return [];
    const forecastEvents = state.polygons
      .filter((shape) =>
        booleanPointInPolygon([lon, lat], polygon([shape.coordinates])),
      )
      .flatMap((shape) => shape.forecastEvents);
    return forecastEvents.length ? [{ startTime: state.startTime, forecastEvents }] : [];
  });
}

function cloud(baseKft: number, topKft: number, eightsIndex: number): CloudEvent {
  return {
    type: 'CLOUD',
    parameters: {
      cloudBase: baseKft,
      cloudTop: topKft,
      cloud_eights: EIGHTS[Math.min(EIGHTS.length - 1, eightsIndex)],
    },
    events: [],
  };
}

function shape(coordinates: [number, number][], events: ForecastPolygon['forecastEvents']): ForecastPolygon {
  return { coordinates, forecastEvents: events, status: PolygonsStatus.Distributed };
}

function lowCloud(frameHours: number): ForecastPolygon {
  const east = 34.6 + 0.3 * Math.sin(frameHours / 4);
  const step = Math.round(frameHours / 3);
  const event = cloud(1.5, 3 + 0.5 * Math.round(Math.sin(frameHours / 6) * 2), 3 + (step % 5));
  if (Math.sin(frameHours / 4) > -0.4) {
    event.events.push({
      type: 'PRECIPITATION',
      parameters: {
        precip_type: RAIN_TYPES[step % RAIN_TYPES.length],
        precip_prob: 30 + (frameHours % 5) * 10,
      },
      events: [],
    });
    if (frameHours % 12 >= 6) {
      event.events.push({
        type: 'CB',
        parameters: { cb_type: ['SCATTERED', 'CB', 'CLOUDY'][step % 3], cb_prob: 40 },
        events: [],
      });
    }
  }
  return shape(
    [
      [31.6, 30.3],
      [east, 30.1],
      [east + 0.7, 31.4],
      [east - 0.3, 32.4],
      [31.8, 32.1],
    ],
    [event],
  );
}

function midCloud(frameHours: number): ForecastPolygon {
  const west = 33.6 + 0.25 * Math.cos(frameHours / 5);
  return shape(
    [
      [west, 30.6],
      [west + 2.6, 30.9],
      [west + 2.2, 32.6],
      [west - 0.4, 32.2],
    ],
    [cloud(10, 18, 2 + (Math.round(frameHours / 3) % 6))],
  );
}

function highCloud(frameHours: number): ForecastPolygon {
  const east = 34.72 + 0.3 * Math.sin(frameHours / 4);
  return shape(
    [
      [31.72, 30.42],
      [east, 30.22],
      [east + 0.7, 31.52],
      [east - 0.3, 32.52],
      [31.92, 32.22],
    ],
    [cloud(25, 32, 1 + (Math.round(frameHours / 3) % 7))],
  );
}

function surfaceHaze(frameHours: number): ForecastPolygon {
  const north = 30.6 + 0.2 * Math.sin(frameHours / 6);
  const band = VISIBILITY_BANDS[(1 + Math.round(frameHours / 3)) % VISIBILITY_BANDS.length];
  return shape(
    [
      [32.4, 29.2],
      [35.9, 29.3],
      [35.5, north],
      [32.8, north - 0.1],
    ],
    [
      {
        type: 'HAZE',
        parameters: { haze_min_vis: band.minVis, haze_max_vis: band.maxVis, haze_base: 0, haze_top: 3 },
        events: [],
      },
    ],
  );
}

function highHaze(frameHours: number): ForecastPolygon {
  const band = VISIBILITY_BANDS[Math.round(frameHours / 3) % VISIBILITY_BANDS.length];
  return shape(
    [
      [34.9, 31.9],
      [36.2, 32.1],
      [36.0, 33.2],
      [34.6, 33.1],
    ],
    [
      {
        type: 'HAZE',
        parameters: { haze_min_vis: band.minVis, haze_max_vis: band.maxVis, haze_base: 8, haze_top: 14 },
        events: [],
      },
    ],
  );
}

function fogPatch(frameHours: number): ForecastPolygon {
  const size = 0.35 + 0.1 * Math.sin(frameHours / 2);
  const band = VISIBILITY_BANDS[Math.round(frameHours / 3) % VISIBILITY_BANDS.length];
  const event = cloud(0, 1, 8);
  event.events.push({
    type: 'FOG',
    parameters: { fog_min_vis: band.minVis, fog_max_vis: band.maxVis },
    events: [],
  });
  return shape(
    [
      [33.6 - size, 32.5 - size],
      [33.6 + size, 32.5 - size],
      [33.6 + size, 32.5 + size],
      [33.6 - size, 32.5 + size],
    ],
    [event],
  );
}
