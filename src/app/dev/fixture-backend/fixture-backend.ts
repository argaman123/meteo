import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { from } from 'rxjs';
import { Sector } from '../../types/polygons';
import { Bounds } from '../../types/wrap';
import { hoursToMs, msToHours } from '../../utils/time';
import { syntheticPolygons } from './synthetic-polygons';
import { radarTimes, syntheticRadarWrap } from './synthetic-radar';
import { syntheticObservations } from './synthetic-observations';
import { SATELLITE_SECTORS, satelliteHours, syntheticSatelliteImage } from './synthetic-satellite';
import { SyntheticWeather } from './synthetic-weather';

const ARTIFICIAL_LATENCY_MS = 150;
const STEP_HOURS = 3;
const BACK_HOURS = 24;
const FORWARD_HOURS = 96;

const RUN_TIME =
  Math.floor(Date.now() / hoursToMs(STEP_HOURS)) * hoursToMs(STEP_HOURS);

const POLYGON_HOURS: Record<Sector, number[]> = {
  [Sector.Center]: Array.from({ length: 33 }, (_, index) => index * 3),
  [Sector.North]: [0, 3, 12, 21, 45],
};

let weatherPromise: Promise<SyntheticWeather> | null = null;

export const fixtureBackendInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/')) return next(request);
  return from(answerFromFixtures(request));
};

async function answerFromFixtures(request: HttpRequest<unknown>): Promise<HttpEvent<unknown>> {
  await new Promise((resolve) => setTimeout(resolve, ARTIFICIAL_LATENCY_MS));
  if (request.url === '/api/satellite/configuration') {
    return new HttpResponse({
      status: 200,
      body: { satelliteId: 'sat-a', channel: 'ir', sector: 'near' },
    });
  }
  if (request.url === '/api/satellite/bounds') {
    const perSector = Object.fromEntries(
      Object.entries(SATELLITE_SECTORS).map(([sector, { bounds }]) => [sector, bounds]),
    );
    return new HttpResponse({ status: 200, body: { 'sat-a': perSector, 'sat-b': perSector } });
  }
  if (request.url === '/api/satellite/hours') {
    const sector = request.params.get('sector') ?? '';
    const start = Number(request.params.get('start'));
    const end = Number(request.params.get('end'));
    return new HttpResponse({ status: 200, body: satelliteHours(sector, start, end) });
  }
  if (request.url === '/api/satellite/image') {
    const sector = request.params.get('sector') ?? '';
    const channel = request.params.get('channel') ?? '';
    const time = Number(request.params.get('time'));
    const blob = await syntheticSatelliteImage(sector, channel, time);
    return new HttpResponse({ status: 200, body: blob });
  }
  if (request.url === '/api/radar/times') {
    const start = Number(request.params.get('start'));
    const end = Number(request.params.get('end'));
    return new HttpResponse({ status: 200, body: radarTimes(start, end) });
  }
  if (request.url === '/api/radar') {
    const wrap = await syntheticRadarWrap(
      request.params.get('radar') ?? '',
      Number(request.params.get('time')),
    );
    if (!wrap) {
      throw new HttpErrorResponse({ url: request.url, status: 404, statusText: 'No radar' });
    }
    return new HttpResponse({ status: 200, body: wrap });
  }
  if (request.url === '/api/observations') {
    const points = await syntheticObservations(
      request.params.get('parameter') ?? '',
      Number(request.params.get('time')),
    );
    return new HttpResponse({ status: 200, body: points });
  }
  if (request.url === '/api/hours') {
    return new HttpResponse({ status: 200, body: hoursBetween(request, -BACK_HOURS, FORWARD_HOURS) });
  }
  if (request.url === '/api/polygons/hours') {
    const sector = (request.params.get('sector') ?? '') as Sector;
    const start = Number(request.params.get('start'));
    const end = Number(request.params.get('end'));
    const times = (POLYGON_HOURS[sector] ?? [])
      .map((hours) => RUN_TIME + hoursToMs(hours))
      .filter((time) => time >= start && time <= end);
    return new HttpResponse({ status: 200, body: times });
  }
  if (request.url === '/api/polygons') {
    const sector = (request.params.get('sector') ?? '') as Sector;
    const time = Number(request.params.get('time'));
    const hours = msToHours(time - RUN_TIME);
    const wrap = (POLYGON_HOURS[sector] ?? []).includes(hours)
      ? syntheticPolygons(sector, hours, RUN_TIME)
      : null;
    if (!wrap) {
      throw new HttpErrorResponse({ url: request.url, status: 404, statusText: 'No map' });
    }
    return new HttpResponse({ status: 200, body: wrap });
  }
  if (request.url !== '/api/grids') {
    throw new HttpErrorResponse({ url: request.url, status: 404, statusText: 'Not Found' });
  }
  const parameter = request.params.get('parameter') ?? '';
  const model = request.params.get('model') ?? 'wide';
  const time = Number(request.params.get('time'));
  const bounds = (request.params.get('bbox') ?? '').split(',').map(Number) as Bounds;
  const height = request.params.get('height');
  const pressure = request.params.get('pressure');
  const weather = await loadWeather();
  const wrap = weather.wrap(
    model,
    parameter,
    bounds,
    frameHours(time),
    RUN_TIME,
    height === null ? null : Number(height),
    pressure === null ? null : Number(pressure),
  );
  if (!wrap) {
    throw new HttpErrorResponse({ url: request.url, status: 404, statusText: 'Outside coverage' });
  }
  return new HttpResponse({ status: 200, body: wrap });
}

function hoursBetween(request: HttpRequest<unknown>, firstHours: number, lastHours: number): number[] {
  const start = Number(request.params.get('start'));
  const end = Number(request.params.get('end'));
  const times: number[] = [];
  for (let hours = firstHours; hours <= lastHours; hours += STEP_HOURS) {
    const time = RUN_TIME + hoursToMs(hours);
    if (time >= start && time <= end) times.push(time);
  }
  return times;
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
