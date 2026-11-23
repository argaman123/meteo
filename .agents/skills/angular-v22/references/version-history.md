# Angular Version History (v17 → v22) — what landed when

Cumulative reference so you write correct code on any recent major. **Everything here is available in v22**
unless marked *removed*. When the project is on an older major (check `package.json`), gate features by the
version they were introduced/stabilized. Sourced from the official v20/v21/v22 announcements + the v22.0.0
changelog; defaults verified against a real build.

## v22 (2026-06-03) — current
Defaults flipped + major APIs stabilized.
- **Change detection:** **OnPush is the default** (omit `changeDetection`); `ChangeDetectionStrategy.Default`
  deprecated → use `Eager`.
- **Signal Forms → STABLE** (`@angular/forms/signals`): `form`, `submit`, validators, `validate`/
  `validateAsync`/`validateHttp`/`validateStandardSchema`, `apply`/`applyWhen`/`applyEach`,
  `disabled`/`readonly`/`hidden`, `FieldState.getError()`, `reloadValidation`, `ngNoCva` opt-out.
- **Resources → STABLE:** `resource`, `rxResource`, `httpResource`; plus SSR resource caching.
- **Angular Aria → STABLE** (`@angular/aria`): 12 accessible headless patterns + test harnesses.
- **DI:** `@Service()` decorator (+ `{ autoProvided:false }` / `{ factory }`); `injectAsync()` + `onIdle` prefetch.
- **Signals:** `debounced()` *(experimental — returns a `Resource`)*.
- **HTTP:** Fetch is the default backend (`withFetch()` deprecated no-op); `reportUploadProgress`/
  `reportDownloadProgress` replace `reportProgress`.
- **SSR:** incremental hydration is the **default**; `provideServerRendering` max response buffer size.
- **Testing:** **Vitest is the default** (`@angular/build:unit-test`); `TestBed.getLastFixture()`.
- **Templates:** `//` & `/* */` comments inside element tags; optional chaining now yields `undefined`.
- **Router:** `paramsInheritanceStrategy` defaults to `'always'`; `CanMatchFn` `currentSnapshot` required;
  `provideRoutes()` **removed**; `[browserUrl]`; `isActive()` signal; `withComponentInputBinding({...})`;
  *experimental* `withExperimentalPlatformNavigation()` (Navigation API) & `withExperimentalAutoCleanupInjectors()`.
- **AI:** WebMCP tools (expose app capabilities to in-browser agents; experimental — verify exact export
  names via the docs) + `provideExperimentalWebMcpForms`; in-page AI debugging tools (DI graph). MCP
  `devserver.*`/`test`/`e2e` tools graduating.
- **Announced but NOT in 22.0.0** (don't emit on 22.0.x — verified they fail to build): `@boundary` error
  block (dev preview ~Q3 2026); **selectorless** components (RFC/prototype).
- **Removed:** `provideRoutes`, `ComponentFactory`/`ComponentFactoryResolver`, `createNgModuleRef`,
  `ChangeDetectorRef.checkNoChanges`, Hammer.js; `min`/`max` validators no longer accept string values.
- **Requires:** Node `^22.22.3 || ^24.15.0 || ^26.0.0` (Node 20 dropped), TypeScript `~6.0`.

## v21 (late 2025)
- **Zoneless is the default** (new apps ship no `zone.js`).
- **Vitest → default + stable** test runner (Karma still supported, no longer the default).
- **Signal Forms** introduced *(experimental)*.
- **Angular Aria** *(developer preview)*.
- **Angular CLI MCP server → stable** (`get_best_practices`, `search_documentation`, `list_projects`, …).
- Templates (21.1): **spread** syntax + multi-value fall-through `@case`. (21.2): `instanceof`, inline arrow
  functions, `@default never;` exhaustiveness, **TypeScript 6**, regex literals in expressions.
- SimpleChanges is generic; CDK overlays use native popovers; Signals DevTools formatter.

## v20 (mid 2025)
- **`effect` / `linkedSignal` / `toSignal` → STABLE** (core `signal`/`computed`/`input` already stable).
- **Incremental hydration + per-route render modes (`RenderMode`) → STABLE.**
- **Zoneless → developer preview** (`provideZonelessChangeDetection`).
- `resource` / `httpResource` *(experimental)*; **Vitest** *(experimental)* with watch + browser testing.
- Templates: untagged template literals (`` `col-${n}` ``), exponentiation `**`, the `in` operator.
- `createComponent` with `inputBinding`/`outputBinding`/`twoWayBinding`; more extended diagnostics.
- **`*ngIf`/`*ngFor`/`*ngSwitch` deprecated** — they still COMPILE in v22 (verified) but migrate to
  `@if`/`@for`/`@switch`. Style guide: class/file-name suffixes optional.

## v19 (late 2024)
- **`standalone: true` becomes the default** — stop writing it; `NgModule` only for legacy interop.
- `linkedSignal` & `resource()` introduced *(experimental)*; incremental hydration + event replay *(experimental)*.
- `HostAttributeToken`; zoneless available as an early experimental provider.

## v17–v18 (2023–2024) — the modern baseline
- **Standalone** APIs stabilized; `bootstrapApplication` + `app.config.ts` (no root `NgModule`).
- **Built-in control flow** `@if`/`@for`/`@switch` (v17) and **`@defer`** deferrable views.
- **Signals** `signal`/`computed`/`effect` (v17 developer preview; core stabilized by ~v19, `effect` v20);
  **`@let`** template variables (v18.1).
- **esbuild/Vite application builder** + dev server; functional **guards** & **interceptors**; SSR + hydration.

## Quick "is it safe on version N?" cheatsheet
- Signals core, control flow, `@defer`, standalone components: **v17+** (use everywhere).
- `@let`: **v18.1+**. `linkedSignal` / `resource` / `httpResource`: stable **v20+** (preview from v19).
- **Zoneless default & Vitest default: v21+.** **Signal Forms stable: v22** (experimental in v21).
- **OnPush default, `@Service`, `injectAsync`, Fetch default, incremental-hydration default, `//`+`/* */`
  tag comments: v22.**
- Not shipped in 22.0.0: `@boundary`, selectorless (don't emit yet).
