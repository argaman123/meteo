import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { from } from 'rxjs';
import { SECTORS } from '../../layers/polygons/polygons-layer';
import { PolygonsStatus, Sector } from '../../types/polygons';
import { RadarEntity } from '../../types/radar';
import { SatelliteChannel } from '../../types/satellite';
import { Bounds } from '../../types/wrap';
import { contains } from '../../utils/geo';
import { daysToMs, hoursToMs, msToHours } from '../../utils/time';
import { syntheticPointEvents, syntheticPolygons } from './synthetic-polygons';
import { radarTimeRange, syntheticRadarWrap } from './synthetic-radar';
import { syntheticObservations } from './synthetic-observations';
import { satImages, satelliteSectors, syntheticSatelliteImage } from './synthetic-satellite';
import { SyntheticWeather } from './synthetic-weather';

const ARTIFICIAL_LATENCY_MS = 150;
const STEP_HOURS = 3;
const BACK_HOURS = 24;
const FORWARD_HOURS = 96;
const BACKEND_PATHS = [
  '/model/',
  '/polygon/',
  '/satellite/',
  '/satellite-sectors/',
  '/radar/',
  '/observations/',
];
const AIR_COLUMN_PRESSURES = [1000, 925, 850, 700, 600, 500, 400, 300, 250, 200, 150, 100];

const RUN_TIME =
  Math.floor(Date.now() / hoursToMs(STEP_HOURS)) * hoursToMs(STEP_HOURS);

const POLYGON_HOURS: Record<Sector, number[]> = {
  [Sector.Dev]: Array.from({ length: 33 }, (_, index) => index * 3),
  [Sector.Big]: [0, 3, 12, 21, 45],
};

interface Route {
  method?: 'GET' | 'POST';
  path: RegExp;
  answer: (request: HttpRequest<unknown>, match: RegExpMatchArray) => Promise<unknown>;
}

const ROUTES: Route[] = [
  {
    path: /^\/model\/data-limited\/([^/]+)\/MB(\d+)\/([^/]+)\/(\d+)\/params$/,
    answer: async (request, [, model, pressure, parameter, forecast]) =>
      (await loadWeather()).wrap(
        model,
        parameter,
        boundsOf(request),
        frameHours(Number(forecast)),
        RUN_TIME,
        null,
        Number(pressure),
      ) ?? undefined,
  },
  {
    path: /^\/model\/data_with_flat_heights_with_limit\/([^/]+)\/(\d+)\/([^/]+)\/(\d+)\/params$/,
    answer: async (request, [, model, height, parameter, forecast]) =>
      (await loadWeather()).wrap(
        model,
        parameter,
        boundsOf(request),
        frameHours(Number(forecast)),
        RUN_TIME,
        Number(height),
        null,
      ) ?? undefined,
  },
  {
    path: /^\/model\/air_column_nearest$/,
    answer: async (request) => {
      const step = hoursToMs(STEP_HOURS);
      const time = Math.round(Number(request.params.get('forecasttime')) / step) * step;
      return {
        time,
        airLevelDataList: (await loadWeather()).airColumn(
          Number(request.params.get('lat')),
          Number(request.params.get('lon')),
          frameHours(time),
          AIR_COLUMN_PRESSURES,
        ),
      };
    },
  },
  {
    path: /^\/model\/air_column_in_between$/,
    answer: async (request) => {
      const weather = await loadWeather();
      const step = hoursToMs(STEP_HOURS);
      const start = Number(request.params.get('start'));
      const end = Number(request.params.get('end'));
      const columns = [];
      for (let time = Math.ceil(start / step) * step; time <= end; time += step) {
        columns.push({
          time,
          airLevelDataList: weather.airColumn(
            Number(request.params.get('lat')),
            Number(request.params.get('lon')),
            frameHours(time),
            AIR_COLUMN_PRESSURES,
          ),
        });
      }
      return columns;
    },
  },
  {
    path: /^\/polygon\/get_maps_times$/,
    answer: async (request) => {
      const sector = request.params.get('sector') as Sector;
      const start = Number(request.params.get('start_time'));
      const end = Number(request.params.get('end_time'));
      return (POLYGON_HOURS[sector] ?? [])
        .map((hours) => RUN_TIME + hoursToMs(hours))
        .filter((time) => time >= start && time <= end)
        .map((startTime) => ({ startTime, status: PolygonsStatus.Distributed, timeSaved: RUN_TIME }));
    },
  },
  {
    path: /^\/polygon\/get_latest_polygons_by_time_sector_time_saved_status$/,
    answer: async (request) => {
      const sector = request.params.get('sector') as Sector;
      const time = Number(request.params.get('time'));
      const hours = Math.floor(msToHours(time - RUN_TIME));
      return (POLYGON_HOURS[sector] ?? []).includes(hours)
        ? syntheticPolygons(sector, hours, RUN_TIME)
        : null;
    },
  },
  {
    path: /^\/polygon\/get_point_events_between_times$/,
    answer: async (request) => {
      const lon = Number(request.params.get('lon'));
      const lat = Number(request.params.get('lat'));
      const start = Number(request.params.get('start_time'));
      const end = Number(request.params.get('end_time'));
      const sector = [Sector.Dev, Sector.Big].find((candidate) =>
        contains(SECTORS[candidate], lon, lat),
      );
      if (!sector) return [];
      const frames = POLYGON_HOURS[sector].filter((hours) => {
        const time = RUN_TIME + hoursToMs(hours);
        return time >= start && time <= end;
      });
      return syntheticPointEvents(sector, lon, lat, frames, RUN_TIME);
    },
  },
  {
    path: /^\/satellite\/getConfiguration$/,
    answer: async () => [
      {
        channel: SatelliteChannel.FLC,
        startDateTime: Math.floor(RUN_TIME / daysToMs(1)) * daysToMs(1) - daysToMs(2),
        endDateTime: Math.floor(RUN_TIME / daysToMs(1)) * daysToMs(1) + daysToMs(30),
        startHour: hoursToMs(18),
        endHour: hoursToMs(4),
        satellite: 9,
      },
    ],
  },
  {
    path: /^\/satellite-sectors\/get-all$/,
    answer: async () => satelliteSectors(),
  },
  {
    path: /^\/satellite\/filterBy$/,
    answer: async (request) =>
      satImages(
        Number(request.params.get('start')),
        Number(request.params.get('end')),
        request.params.get('source') ?? '',
        request.params.get('sector') ?? '',
        Number(request.params.get('sat_id')),
      ),
  },
  {
    path: /^\/satellite\/getImageBy$/,
    answer: async (request) => syntheticSatelliteImage(request.params.get('name') ?? ''),
  },
  {
    path: /^\/radar\/get_time_range_to_live_radars$/,
    answer: async (request) =>
      radarTimeRange(Number(request.params.get('start')), Number(request.params.get('end'))),
  },
  {
    method: 'POST',
    path: /^\/radar\/get_wrap_for_entities$/,
    answer: async (request) =>
      (await syntheticRadarWrap((request.body as { entities: RadarEntity[] }).entities[0])) ??
      undefined,
  },
  {
    path: /^\/observations\/getDataByParam$/,
    answer: async (request) =>
      syntheticObservations(
        request.params.get('param') ?? '',
        Number(request.params.get('start')),
        Number(request.params.get('end')),
      ),
  },
];

let weatherPromise: Promise<SyntheticWeather> | null = null;

export const fixtureBackendInterceptor: HttpInterceptorFn = (request, next) => {
  if (!BACKEND_PATHS.some((path) => request.url.startsWith(path))) return next(request);
  return from(answerFromFixtures(request));
};

async function answerFromFixtures(request: HttpRequest<unknown>): Promise<HttpEvent<unknown>> {
  await new Promise((resolve) => setTimeout(resolve, ARTIFICIAL_LATENCY_MS));
  for (const route of ROUTES) {
    const match = request.url.match(route.path);
    if (!match || request.method !== (route.method ?? 'GET')) continue;
    const body = await route.answer(request, match);
    if (body === undefined) {
      throw new HttpErrorResponse({ url: request.url, status: 500, statusText: 'Internal server error' });
    }
    return new HttpResponse({ status: 200, body });
  }
  throw new HttpErrorResponse({ url: request.url, status: 404, statusText: 'Not Found' });
}

function boundsOf(request: HttpRequest<unknown>): Bounds {
  return [
    Number(request.params.get('min_lon')),
    Number(request.params.get('min_lat')),
    Number(request.params.get('max_lon')),
    Number(request.params.get('max_lat')),
  ];
}

function frameHours(unixTime: number): number {
  const hours = msToHours(unixTime - RUN_TIME);
  return Math.min(FORWARD_HOURS, Math.max(-BACK_HOURS, hours));
}

function loadWeather(): Promise<SyntheticWeather> {
  weatherPromise ??= Promise.all([
    fetch('/fixtures/gfs-surface-wind.json').then((response) => response.json()),
    fetch('/fixtures/land.geojson').then((response) => response.json()),
  ]).then(([gfsRecords, landGeojson]) => new SyntheticWeather(gfsRecords, landGeojson));
  return weatherPromise;
}
