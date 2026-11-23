# Project Setup (Angular v22)

## Creating a project
```bash
npm install -g @angular/cli@^22        # or: npx @angular/cli@22 new my-app
ng new my-app                          # prompts: stylesheet (CSS default), SSR/SSG
# non-interactive (agents/CI): ng new my-app --interactive=false --ai-config=agents --style=scss --ssr
cd my-app
ng serve                               # PORT=4203 ng serve  to change port
```
`ng new` in v22 scaffolds: standalone bootstrap (no `AppModule`), **zoneless** (no `zone.js`), **OnPush**
by default, Fetch-based HTTP, **Vitest** as the test runner, the **esbuild** application builder, and
optional SSR with incremental hydration. Accept defaults for a modern app. (Zoneless is now implicit —
the generated `app.config.ts` doesn't call `provideZonelessChangeDetection()` at all.)

Useful generators (all produce standalone artifacts):
```bash
ng g component features/dashboard        # --inline-template --inline-style optional
ng g service core/user
ng g directive shared/highlight
ng g pipe shared/truncate
ng g guard core/auth                     # functional guard by default
ng g resolver core/user
ng g @angular/ssr:server                 # add SSR to an existing app
```

## package.json (representative v22 pins)
Use caret ranges that the CLI generates; exact patch versions move, majors are what matter.
```jsonc
{
  "dependencies": {
    "@angular/common": "^22.0.0",
    "@angular/compiler": "^22.0.0",
    "@angular/core": "^22.0.0",
    "@angular/forms": "^22.0.0",
    "@angular/platform-browser": "^22.0.0",
    "@angular/router": "^22.0.0",
    "@angular/aria": "^22.0.0",          // if using Angular Aria
    "@angular/ssr": "^22.0.0",           // if using SSR
    "rxjs": "~7.8.0",
    "tslib": "^2.3.0"
    // NOTE: no "zone.js" — new apps are zoneless
  },
  "devDependencies": {
    "@angular/build": "^22.0.0",         // esbuild app builder + Vitest unit-test builder
    "@angular/cli": "^22.0.0",
    "@angular/compiler-cli": "^22.0.0",
    "typescript": "~6.0.2",
    "vitest": "^4.0.0",                  // CLI generates ^4.x (Vitest 4)
    "jsdom": "^28.0.0",
    "prettier": "^3.8.0"
  }
}
```
If you must keep Zone.js (migrating a legacy app), add `zone.js` back and add
`provideZoneChangeDetection()` to the providers list.

## main.ts (standalone bootstrap)
```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
```

## app.config.ts (the central provider list)
This replaces `AppModule`. Everything app-wide is wired here. The **actual v22 CLI default is minimal**
(verified from `ng new`):
```ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
  ],
};
```
Note what's **absent**: there is **no `provideZonelessChangeDetection()`**. Zoneless is the implicit
default in v22 (the app ships with no `zone.js`), so you don't add a provider for it. The function still
exists for explicitness, but the CLI doesn't generate it.

A fuller, real-world config layers on router features, HTTP, and (if SSR) hydration:
```ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),   // Fetch is default; no withFetch() needed
    provideClientHydration(withEventReplay()),                // only if SSR enabled
  ],
};
```
Notes:
- **Zoneless is implicit** — don't add `provideZonelessChangeDetection()` to new apps; it's redundant.
  Only add `provideZoneChangeDetection()` (and the `zone.js` dep) when migrating a legacy zone-based app.
- `withFetch()` is deprecated — Fetch is already the default. Add `withXhr()` only to force XHR.
- **Incremental hydration is the default** once `provideClientHydration()` is present; opt out with
  `withNoIncrementalHydration()` (the old `withIncrementalHydration()` is now redundant). `withEventReplay()`
  replays user events captured before hydration.

## app.routes.ts
```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home').then(m => m.Home) },
  {
    path: 'users',
    loadChildren: () => import('./features/users/users.routes').then(m => m.USER_ROUTES),
  },
  { path: '**', loadComponent: () => import('./shared/not-found').then(m => m.NotFound) },
];
```

## The root component (app.ts)
The CLI names the root component `App` (selector `app-root`) in v22.
```ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {}
```

## Recommended folder layout
```
src/
  app/
    core/         # singletons: services (@Service), interceptors, guards, models
    shared/       # reusable components, directives, pipes
    features/     # feature areas, each with its own *.routes.ts and components
    app.ts        # root component
    app.config.ts
    app.routes.ts
  main.ts
  styles.scss
```

## SSR / server setup
With SSR enabled the CLI adds `main.server.ts`, `app.config.server.ts`, and `server.ts`.
```ts
// app.config.server.ts
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/ssr';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering()],
};
export const config = mergeApplicationConfig(appConfig, serverConfig);
```
Per-route render mode (SSR vs CSR vs prerender) lives in route config — see
`routing-http-ssr.md`. Build/serve SSR with `ng build` then `node dist/<app>/server/server.mjs`,
or `ng serve` for dev SSR.

## Styling
- Global styles in `src/styles.scss` (chosen at `ng new`).
- Component styles are scoped by default via emulated encapsulation:
  ```ts
  @Component({ selector: 'app-card', styleUrl: './card.scss', template: `…` })
  ```
- Tailwind: prefer **`ng add tailwindcss`** (wires everything up automatically); or manually
  `npm i -D tailwindcss @tailwindcss/postcss postcss`, register the PostCSS plugin, and `@import "tailwindcss";`
  in your global stylesheet (Tailwind v4 style). Utilities then work in templates as usual.
