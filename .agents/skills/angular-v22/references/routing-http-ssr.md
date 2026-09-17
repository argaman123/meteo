# Routing, HTTP & SSR (Angular v22)

## Routing

### Defining routes (lazy by default)
```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./home/home').then(m => m.Home) },
  {
    path: 'users',
    loadChildren: () => import('./users/users.routes').then(m => m.USER_ROUTES),
  },
  { path: 'users/:id', loadComponent: () => import('./users/detail').then(m => m.UserDetail) },
  { path: '**', loadComponent: () => import('./not-found').then(m => m.NotFound) },
];
```
Register with `provideRouter(routes, …features)` in `app.config.ts`.

### Component input binding (route params → signal inputs)
With `withComponentInputBinding()`, route params/query/data bind straight to component inputs:
```ts
provideRouter(routes, withComponentInputBinding());
```
```ts
@Component({ /* … */ })
export class UserDetail {
  id = input.required<string>();        // from path param :id
  tab = input('overview');              // from query param ?tab=
}
```
v22 lets you configure it: `withComponentInputBinding({ queryParams: false, unmatchedInputBehavior:
'alwaysUndefined' /* or 'undefinedIfStale' */ })`.

### Functional guards & resolvers (no class guards)
```ts
import { CanActivateFn, CanMatchFn, ResolveFn, Router, Route, UrlSegment } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  return inject(AuthService).isLoggedIn() ? true : router.createUrlTree(['/login']);
};

// v22: CanMatchFn's currentSnapshot (3rd param) is now REQUIRED
export const featureMatch: CanMatchFn = (route: Route, segments: UrlSegment[], currentSnapshot) => {
  return inject(FlagService).enabled('feature-x');
};

export const userResolver: ResolveFn<User> = (route) =>
  inject(UserService).fetch(route.paramMap.get('id')!);
```
Attach: `{ path: 'admin', canActivate: [authGuard], canMatch: [featureMatch], resolve: { user: userResolver } }`.

### RouterLink, outlet, navigation
```html
<a routerLink="/users" routerLinkActive="active">Users</a>
<a [routerLink]="['/users', u.id]" [queryParams]="{ tab: 'posts' }">{{ u.name }}</a>
<router-outlet />
```
- v22 `RouterLink` adds `[browserUrl]` to show a different address-bar URL than the matched route:
  `<a [routerLink]="['/i', id]" [browserUrl]="'/items/' + slug">…</a>`.
- v22 `isActive(url, router, matchOptions?)` returns a **`Signal<boolean>`** — a reactive way to check the
  active route in TS (alternative to the `routerLinkActive` directive):
  ```ts
  import { isActive } from '@angular/router';
  readonly onUsers = isActive('/users', inject(Router));                    // Signal<boolean>
  readonly onExact = isActive('/users', inject(Router), { paths: 'exact' });
  ```
- Programmatic: `inject(Router).navigate(['/users', id])` / `navigateByUrl(url)`.
- **Breaking:** default `paramsInheritanceStrategy` is now `'always'` (was `'emptyOnly'`). Restore via
  `provideRouter(routes, withRouterConfig({ paramsInheritanceStrategy: 'emptyOnly' }))` if a child
  route unexpectedly inherits parent params.
- `provideRoutes()` was removed — always use `provideRouter()`.

### Experimental router features (v22, developer preview)
- **Navigation API integration** — `provideRouter(routes, withExperimentalPlatformNavigation())` routes
  navigation through the browser's native Navigation API: it intercepts `RouterLink` *and* plain anchors,
  uses native scroll restoration, and cuts boilerplate for loading indicators / a11y announcements.
- **Auto-cleanup of route injectors** — `withExperimentalAutoCleanupInjectors()` destroys a route's injector
  when the route is torn down. For a custom `RouteReuseStrategy`, `destroyDetachedRouteHandle()` releases a
  detached handle's resources.

### Per-route render mode (SSR/CSR/prerender)
```ts
import { ServerRoute, RenderMode } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'dashboard', renderMode: RenderMode.Server },   // SSR per request
  { path: 'admin/**', renderMode: RenderMode.Client },    // CSR only
];
```
Provide with `provideServerRouting(serverRoutes)` (server config). This decides, per route, whether
Angular prerenders, server-renders, or ships client-only.

## HTTP

### Setup (Fetch is the default backend)
```ts
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';

provideHttpClient(withInterceptors([authInterceptor]));   // Fetch backend, no withFetch() needed
// To force XMLHttpRequest instead: provideHttpClient(withXhr());
```
`withFetch()` is a deprecated no-op (Fetch already default).

### Calls
Prefer `httpResource()` for declarative GETs (see components-di-reactivity.md). For commands/imperative calls:
```ts
import { HttpClient } from '@angular/common/http';
const http = inject(HttpClient);
http.post<User>('/api/users', body).subscribe(/* … */);    // returns Observable
// or bridge to a signal: user = toSignal(http.get<User>('/api/users/1'));
```

### Functional interceptors
```ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(authReq);
};
```

### Upload/download progress (renamed in v22)
`reportProgress` is deprecated. Use the specific options:
```ts
http.post('/upload', form, { reportUploadProgress: true, observe: 'events' });
http.get('/big-file',     { reportDownloadProgress: true, observe: 'events' });
```

### SSR transfer cache caveat (v22)
The HTTP transfer cache now **skips requests carrying cookies / `withCredentials`** by default
(security). Don't rely on credentialed responses being transferred from server to client.

## SSR & Hydration

### Enabling
`ng new --ssr` or `ng add @angular/ssr`. Client config opts into hydration:
```ts
import { provideClientHydration, withIncrementalHydration, withEventReplay } from '@angular/platform-browser';

provideClientHydration(
  withIncrementalHydration(),   // DEFAULT behavior in v22; opt out with withNoIncrementalHydration()
  withEventReplay(),            // replay user events that fired before hydration
);
```

### Incremental hydration with @defer
Incremental hydration hydrates islands on demand using the same `@defer` triggers:
```html
@defer (hydrate on viewport) {
  <comments-section [postId]="id()" />
}
```
`hydrate on viewport | interaction | idle | hover | timer(…) | immediate | never`. This ships
interactive regions lazily, cutting initial JS.

### Server entry
`server.ts` wires the SSR engine (e.g. an Express/Node handler from `@angular/ssr`). Build with
`ng build`; run the emitted `dist/<app>/server/server.mjs`. Use `isPlatformBrowser(inject(PLATFORM_ID))`
or `afterNextRender()` to guard browser-only APIs (e.g. `window`, `localStorage`) so they don't run
on the server.
