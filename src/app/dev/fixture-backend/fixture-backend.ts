import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { from } from 'rxjs';
import { Bounds } from '../../types/wrap';
import { SyntheticWeather } from './synthetic-weather';

const ARTIFICIAL_LATENCY_MS = 150;
const STEP_HOURS = 3;
const BACK_HOURS = 24;
const FORWARD_HOURS = 96;

const RUN_TIME_UNIX_SECONDS =
  Math.floor(Date.now() / 1000 / (STEP_HOURS * 3600)) * (STEP_HOURS * 3600);

let weatherPromise: Promise<SyntheticWeather> | null = null;

export const fixtureBackendInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/')) return next(request);
  return from(answerFromFixtures(request));
};

async function answerFromFixtures(request: HttpRequest<unknown>): Promise<HttpEvent<unknown>> {
  await new Promise((resolve) => setTimeout(resolve, ARTIFICIAL_LATENCY_MS));
  if (request.url !== '/api/grids') {
    throw new HttpErrorResponse({ url: request.url, status: 404, statusText: 'Not Found' });
  }
  const parameter = request.params.get('parameter') ?? '';
  const model = request.params.get('model') ?? 'wide';
  const time = Number(request.params.get('time'));
  const bounds = (request.params.get('bbox') ?? '').split(',').map(Number) as Bounds;
  const weather = await loadWeather();
  const wrap = weather.wrap(model, parameter, bounds, frameHours(time), RUN_TIME_UNIX_SECONDS);
  if (!wrap) {
    throw new HttpErrorResponse({ url: request.url, status: 404, statusText: 'Outside coverage' });
  }
  return new HttpResponse({ status: 200, body: wrap });
}

function frameHours(unixSeconds: number): number {
  const hours = Math.round((unixSeconds - RUN_TIME_UNIX_SECONDS) / 3600 / STEP_HOURS) * STEP_HOURS;
  return Math.min(FORWARD_HOURS, Math.max(-BACK_HOURS, hours));
}

function loadWeather(): Promise<SyntheticWeather> {
  weatherPromise ??= Promise.all([
    fetch('/fixtures/gfs-surface-wind.json').then((response) => response.json()),
    fetch('/fixtures/land.geojson').then((response) => response.json()),
  ]).then(([gfsRecords, landGeojson]) => new SyntheticWeather(gfsRecords, landGeojson));
  return weatherPromise;
}
