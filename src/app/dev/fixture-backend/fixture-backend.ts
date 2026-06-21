import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { from } from 'rxjs';
import { Bounds, Wrap } from '../../types/wrap';
import {
  FixtureManifest,
  fixtureFileName,
  nearestFrameHours,
  resampleGridDocument,
} from './grid-window';

const ARTIFICIAL_LATENCY_MS = 150;

let manifestPromise: Promise<FixtureManifest> | null = null;
const documentCache = new Map<string, Promise<Wrap>>();

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
  const manifest = await loadManifest();
  const hours = nearestFrameHours(time, manifest);
  const doc = await loadDocument(model, parameter, hours);
  const windowed = resampleGridDocument(doc, bounds);
  if (!windowed) {
    throw new HttpErrorResponse({ url: request.url, status: 404, statusText: 'Outside coverage' });
  }
  return new HttpResponse({ status: 200, body: windowed });
}

function loadManifest(): Promise<FixtureManifest> {
  manifestPromise ??= fetch('/fixtures/models/manifest.json').then(
    (response) => response.json() as Promise<FixtureManifest>,
  );
  return manifestPromise;
}

function loadDocument(
  model: string,
  parameter: string,
  hours: number,
): Promise<Wrap> {
  const url = `/fixtures/models/${model}/${fixtureFileName(parameter, hours)}`;
  let cached = documentCache.get(url);
  if (!cached) {
    cached = fetch(url).then((response) => {
      if (!response.ok) {
        throw new HttpErrorResponse({ url, status: 404, statusText: 'Unknown fixture' });
      }
      return response.json() as Promise<Wrap>;
    });
    documentCache.set(url, cached);
  }
  return cached;
}
