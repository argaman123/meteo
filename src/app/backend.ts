import { HttpInterceptorFn } from '@angular/common/http';

export const BACKEND_PATHS = [
  '/model/',
  '/polygon/',
  '/satellite/',
  '/satellite-sectors/',
  '/radar/',
  '/observations/',
  '/surface/',
];

export function backendUrlInterceptor(backendUrl: string): HttpInterceptorFn {
  return (request, next) =>
    BACKEND_PATHS.some((path) => request.url.startsWith(path))
      ? next(request.clone({ url: backendUrl + request.url }))
      : next(request);
}
