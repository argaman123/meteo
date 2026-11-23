# Breaking Changes, Deprecations & Migration (Angular v22)

Read this when upgrading an existing app or debugging post-upgrade behavior. Most items have an
automatic migration via `ng update @angular/cli@22 @angular/core@22`; the exceptions are flagged.

## Requirements bumps
- **TypeScript 6.0+** required (5.9 and earlier unsupported).
- **Node 20 dropped**; use supported Node versions (^22.22.3 / ^24.15.0 / ^26.0.0).

## Breaking changes (auto-migrated unless noted)
- **OnPush is the default change detection.** `ChangeDetectionStrategy.Default` is **deprecated** in
  favor of **`Eager`** (same check-always behavior — `Default` is an alias of `Eager`, both value `1`).
  The migration adds `changeDetection: ChangeDetectionStrategy.Eager` to existing components so behavior
  is preserved; new components you write get OnPush by omitting the option.
- **Template optional chaining returns `undefined`, not `null`** (aligns with TS). Migration wraps
  affected expressions; review template comparisons against `null`.
- **HTTP uses Fetch by default.** `withFetch()` is a deprecated no-op. To keep XHR, add `withXhr()`;
  `HttpXhrBackend` is required to retain upload-progress on XHR.
- **`reportProgress` deprecated** → use `reportUploadProgress` / `reportDownloadProgress`.
- **Incremental hydration is default.** `withIncrementalHydration()` now reflects default behavior;
  use `withNoIncrementalHydration()` to opt out.
- **Router `CanMatchFn`** gains a required 3rd parameter `currentSnapshot` (auto-migrated).
- **Router `paramsInheritanceStrategy` default is now `'always'`** (was `'emptyOnly'`).
  ⚠️ **No automatic migration** — manually set
  `withRouterConfig({ paramsInheritanceStrategy: 'emptyOnly' })` if you relied on the old behavior.
- **`provideRoutes()` removed** → use `provideRouter()`.
- **`TitleStrategy.getResolvedTitleForRoute`** return type corrected to `string | undefined`.
- **Signal Forms touch model change:** custom controls use a `touched` input + `touch()` output
  (not a two-way `touched` model). `markAsTouched()` now also marks descendants; pass
  `{ skipDescendants: true }` for the old single-field behavior.
- **Forms min/max validators no longer accept string values** (numeric only).
- **`createNgModuleRef` removed** → use `createNgModule`.
- **`ComponentFactoryResolver` / `ComponentFactory` removed** → pass the component class directly
  (e.g. `ViewContainerRef.createComponent(MyComponent)`).
- **`ChangeDetectorRef.checkNoChanges` removed** → use `fixture.detectChanges()` in tests.
- **Compiler now throws** when an element matches multiple component selectors (`NG8023`) and when
  inputs/outputs/models bind to the same property name (`NG1054`; duplicate input/model names are
  auto-migrated to `linkedSignal`); `data-*` attributes no longer bind inputs/outputs.
- **`platform-browser`:** Hammer.js integration removed; legacy Shadow DOM CSS polyfills removed
  (test components relying on old encapsulation/`::ng-deep` edge cases).
- **SSR transfer cache** skips cookie-bearing / `withCredentials` requests by default.
- **AngularJS upgrade interop:** `getAngularLib`/`setAngularLib` removed → use
  `getAngularJSGlobal`/`setAngularJSGlobal`.
- **`appRef.bootstrap`** second argument no longer accepts `any`.
- Leave animations are no longer limited to removed elements (review animation triggers).

## Deprecations (still work, plan to remove)
- `withFetch()` (Fetch is default — safe to delete).
- `reportProgress` (use upload/download variants).
- Webpack builders `@angular-devkit/build-angular` and `@ngtools/webpack` → migrate to the
  esbuild-based application builder (`@angular/build`).
- `strictTemplates` is still supported in the installed Angular 22.1.3 compiler; keep it enabled for Meteo.

## Defaults that silently change behavior
Even without code edits, an upgraded app behaves differently here — verify after upgrade:
1. Components without explicit `changeDetection` now run **OnPush** (unless migration added `Eager`).
2. New apps are **zoneless**; an upgraded app keeps Zone.js only if it was already present.
3. HTTP runs on **Fetch** — progress events and some interceptor timing differ from XHR.
4. **Router param inheritance** (`'always'`) may expose parent params to child routes.
5. Template optional chaining yields **`undefined`**.

## Migration checklist
1. `ng update @angular/cli@22 @angular/core@22` (commit first; review the diff the schematics make).
2. Bump TypeScript to ~6.0 and use a supported Node version (^22.22.3 / ^24.15.0 / ^26.0.0) in CI/dev.
3. Manually set `paramsInheritanceStrategy: 'emptyOnly'` if needed (no auto-migration).
4. If on Karma/Jasmine, run `ng g @angular/core:migrate-karma-to-vitest` (+ `refactor-jasmine-vitest`).
5. Remove `withFetch()`, switch `reportProgress` → upload/download options.
6. Audit browser-only code for zoneless/SSR correctness (`afterNextRender`, `isPlatformBrowser`).
7. Run the suite; fix any newly-thrown compiler errors (duplicate selectors, double bindings).
