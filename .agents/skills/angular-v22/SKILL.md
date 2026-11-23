---
name: angular-v22
description: >-
  Authoritative Angular v22 knowledge (released June 3, 2026). USE THIS SKILL FOR ANY
  Angular work — scaffolding a new app, writing components/services/directives/pipes,
  forms, routing, HTTP, SSR, testing, or reviewing/upgrading Angular code. Trigger on
  "Angular", "ng new", "ng generate", "standalone component", "signals", "signal forms",
  "form()", "httpResource", "resource()", "@Service", "injectAsync", "debounced",
  "selectorless", "zoneless", "OnPush", "control flow", "@if/@for/@defer", "incremental
  hydration", "Angular Aria", "Vitest", "WebMCP", or any Angular version question. Angular
  v22 changed several DEFAULTS (OnPush, zoneless, Fetch HTTP, Vitest, incremental hydration)
  and stabilized major APIs (Signal Forms, resources, @Service). Relying on pre-v22 habits
  produces wrong code, so ALWAYS consult this skill instead of prior Angular knowledge and
  prefer the patterns documented here.
---

# Angular v22 (released 2026-06-03)

User-authored version reference, checked during Codex setup against installed Angular 22.1.3.
For disputed or unfamiliar APIs, installed package declarations and current angular.dev docs
take precedence over this skill. References retain historical v22.0 notes; verify newer changes.
The project uses the `angular-developer` skill; `angular-new-app` is not installed.
The Angular MCP runs read-only/local-only, so use web search on angular.dev for documentation
rather than assuming its `search_documentation` tool is available.
Compatibility source: https://angular.dev/reference/versions.

This skill is the source of truth for writing Angular v22 code. Prefer everything here over
older Angular habits — v22 flipped several defaults and stabilized big APIs. When the user
is on a different major version, say so and adapt; otherwise assume v22.

## Environment requirements
- **TypeScript** `~6.0` (5.9 and earlier unsupported)
- **Node.js** `^22.22.3 || ^24.15.0 || ^26.0.0` (Node 20 dropped)
- **RxJS** supported peer range `^6.5.3 || ^7.4.0`; retain the project's installed version.

## Work with the official Angular tooling (use this skill alongside them)
This skill is the **v22-accuracy layer**. For exhaustive, per-topic depth, also lean on the Angular Team's
own tooling — the user runs both:
- **Official `angular-developer` skill** (Angular Team, installed locally) — 36 reference files covering
  components, signals, forms, DI, routing, SSR, testing, Aria, styling. Defer to it for deep dives; this
  skill stays focused on *what changed in v22* and *correct, verified patterns* that prevent outdated code.
- **Official `angular-new-app` skill** — scaffolding via `ng new … --interactive=false --ai-config=agents`.
- **Angular CLI MCP server** (`npx @angular/cli mcp`) — tools: `get_best_practices`, `search_documentation`
  (searches angular.dev — prefer it over guessing an unfamiliar API), `list_projects`,
  `onpush_zoneless_migration`, `ai_tutor`; experimental `build`/`test`/`devserver`.
- **Always run `ng build`** after generating code and fix errors before claiming the work is done.

## Official best practices (always apply — from the MCP `get_best_practices`)
- **TypeScript:** strict mode; prefer type inference; avoid `any` (use `unknown` when uncertain).
- **Standalone everything;** never write `standalone: true` (it's the default since v19).
- **Signals for state;** `computed()` for derived state; never `mutate()` (use `set`/`update`).
- **`inject()` over constructor DI.** Services use `@Service()` (or `providedIn:'root'`), single responsibility.
- **Native control flow** (`@if/@for/@switch`), never `*ngIf/*ngFor/*ngSwitch`.
- **Host bindings go in the `host` object** — do NOT use `@HostBinding`/`@HostListener` decorators.
- **`[class.x]`/`[style.x]` bindings**, never `ngClass`/`ngStyle`.
- **`NgOptimizedImage`** for static images (does not work for inline base64).
- **`input()`/`output()` functions**, not decorators. Prefer inline templates for small components.
- **Accessibility is required:** pass AXE and WCAG AA (focus management, color contrast, ARIA).
- **Lazy-load feature routes.** Don't assume template globals like `new Date()` are available.

## The v22 mental model — what changed vs. older Angular
These are the things most likely to make you write outdated code. Internalize them:

| Area | Old default | **v22 default** |
|------|-------------|-----------------|
| Change detection | `Default` (check-always) | **`OnPush`** is the default (omit `changeDetection`); `ChangeDetectionStrategy.Default` is **deprecated** — use `Eager` for check-always |
| Zone.js | Included | **Zoneless** — new apps ship no `zone.js` |
| HTTP backend | `XMLHttpRequest` | **Fetch** (`withFetch()` is now a deprecated no-op) |
| Test runner | Karma + Jasmine | **Vitest** |
| SSR hydration | Full | **Incremental hydration** |
| Templates | `*ngIf`/`*ngFor` | **Built-in control flow** `@if`/`@for`/`@switch` (structural directives still work but are legacy) |
| Modules | `NgModule` | **Standalone** everything (no `NgModule` in new code) |
| Forms | Reactive/Template forms | **Signal Forms** stable (`form()` from `@angular/forms/signals`) |
| Optional chaining in templates | `a?.b` yields `null` | now yields **`undefined`** (matches TS) |

Keep `strictTemplates` enabled; it is still a supported compiler option in Angular 22.1.3.
Standalone is the default (since v19); omit redundant `standalone: true`, which remains valid metadata.
Legacy NgModule-declared components set `standalone: false`.

## New/stabilized v22 APIs (verified against the official release)
- **Signal Forms** — `form(model, path => {…})`, validators take field paths. → `references/signal-forms.md`
- **Resources stable** — `resource()`, `rxResource()`, `httpResource()`. → `references/components-di-reactivity.md`
- **`@Service()` decorator** — shorthand for `@Injectable({ providedIn: 'root' })`.
- **`injectAsync()`** — lazy-load a service; returns a callable you `await`.
- **`debounced()`** — *experimental* signal debounce in `@angular/core` (NOT for production yet).
- **Selectorless components** — NOT shipped in 22.0 (early prototype / RFC). Class-name-as-tag does not
  compile yet; keep using selector-based standalone components. → see `references/templates.md`.
- **Angular Aria** stable — headless accessible UI patterns (`@angular/aria`).
- **Per-route render mode** — `RenderMode.Server | Client` in route config.
- **WebMCP** (experimental) — expose app capabilities as tools to in-browser AI agents via
  `declareExperimentalWebMcpTool()` (`@angular/core`) and `provideExperimentalWebMcpForms()` (`@angular/forms/signals`).
- **`@boundary` error boundaries** — officially **announced for v22 as developer preview (targeted ~Q3 2026)**
  but **NOT in the 22.0.0 release yet** (verified: `@boundary { … } @error (let err) { … }` fails to compile
  on 22.0 with NG5002; the compiler has no support for it). Planned shape:
  `@boundary { <widget /> } @error (let err) { <p>Failed</p> }`. **For 22.0.x today use the `ErrorHandler`
  service + `provideBrowserGlobalErrorListeners()`** (already in the default `app.config.ts`).
- **AI runtime debugging tools** (experimental) — in-page AI tools such as the DI-graph inspector, plus SSR
  resource caching. (WebMCP tool/forms exports are in the bullet above; treat all AI APIs as experimental and
  verify exact names via `search_documentation` before using.)
- Webpack builders (`@angular-devkit/build-angular`, `@ngtools/webpack`) are **deprecated**; use the esbuild-based application builder (`@angular/build`).

## Version timeline — what landed when (everything here is usable in v22)
Your training may predate these. Use them freely; all are stable in v22 unless flagged. When the project is
on an older major, gate features by this list. **Full per-version detail (with status) →
`references/version-history.md`.**
- **v17–v18:** standalone stabilized; built-in control flow `@if/@for/@switch`; `@defer` blocks;
  `signal`/`computed`/`effect`; `@let` (v18.1); esbuild/Vite dev server; functional guards & interceptors.
- **v19:** `standalone: true` becomes the **default** (stop writing it); `linkedSignal` & `resource()`
  introduced (experimental); incremental hydration + event replay (experimental); `HostAttributeToken`.
- **v20:** `effect` / `linkedSignal` / `toSignal` **stable**; `resource`/`httpResource` (experimental);
  **incremental hydration + per-route render modes (`RenderMode`) promoted to stable**; **zoneless →
  developer preview**; **Vitest (experimental)**; template untagged literals, exponentiation `**`, and the
  `in` operator; `*ngIf`/`*ngFor`/`*ngSwitch` **deprecated** (removal targeted ~v22); extended diagnostics.
- **v21:** **zoneless is the default**; **Vitest becomes the default + stable** test runner; Signal Forms
  (experimental); **Angular Aria** (developer preview); template **spread** + multi-value (fall-through)
  `@case` (21.1); template `instanceof`, inline arrow functions, `@default never;`, regex literals,
  **TypeScript 6** (21.2).
- **v22 (this release):** **OnPush default**; `@Service`; `injectAsync`; **Signal Forms / resources /
  Angular Aria stable**; `debounced()` (experimental); Fetch default; **Vitest default**; incremental
  hydration default; `//` & `/* */` comments inside element tags; AI/WebMCP tools; **supported Node 22/24/26 versions and TS 6** required.

## Targeting v21 (this skill supports v21 too — check `package.json` first)
v21 and v22 **share** most modern idioms: zoneless-by-default, standalone, signals (`signal`/`computed`/
`effect`/`linkedSignal`), native control flow + `@let` + `@defer`, resources (`resource`/`rxResource`/
`httpResource`), **Vitest as the default test runner**, and the v21.1/21.2 template upgrades (spread,
multi-value fall-through `@case`, `instanceof`, inline arrow functions, `@default never;`, regex literals).
**On a v21 project, turn OFF these v22-only
changes** (they produce wrong code on v21):

| v22 | use on v21 instead |
|-----|--------------------|
| `@Service()` / `injectAsync()` / `debounced()` | none of these exist in v21 → `@Injectable({ providedIn:'root' })`, manual lazy DI |
| OnPush is the default | default is **check-always** → add `changeDetection: ChangeDetectionStrategy.OnPush` explicitly |
| Signal Forms **stable** | Signal Forms are **experimental/preview** in v21 (same `@angular/forms/signals` import — flag it) |
| Fetch is the default backend | add `withFetch()` to `provideHttpClient(...)` |
| Incremental hydration default | opt in with `withIncrementalHydration()` |
| `//` & `/* */` comments in element tags | not supported — don't emit them |
| template `a?.b` → `undefined` | `a?.b` → `null` |
| `reportUploadProgress` / `reportDownloadProgress` | `reportProgress` |
| `@angular/aria` is **stable** | Angular Aria is **developer preview** in v21 |
| Supported Node 22/24/26 versions and TS 6 | Verify v21 compatibility separately at angular.dev/reference/versions |

Router defaults also differ: v22's `paramsInheritanceStrategy: 'always'`, the required `CanMatchFn`
`currentSnapshot` arg, and the removal of `provideRoutes()` are **v22** changes — v21 keeps the old
behavior. Always confirm the major from `package.json` and adapt; never force v22-only syntax onto v21.

## Quickstart — a correct, minimal v22 component
This is the shape to default to: standalone, signal inputs, `inject()`, native control flow,
OnPush implied. No `NgModule`, no constructor DI, no `*ngIf`.

```ts
import { Component, signal, computed, inject, input } from '@angular/core';
import { UserService } from './user.service';

@Component({
  selector: 'app-greeting',
  // standalone is implied in v22; OnPush is the default change detection
  template: `
    @if (user(); as u) {
      <p>Hello, {{ u.name }} — {{ upper() }}</p>
    } @else {
      <p>Loading…</p>
    }
  `,
})
export class Greeting {
  private users = inject(UserService);
  name = input.required<string>();           // signal input
  user = this.users.byName(this.name);        // a signal/resource
  upper = computed(() => this.name().toUpperCase());
}
```

## How to use the reference files
Read the file that matches the task before writing non-trivial code — they contain exact,
verified v22 syntax. Don't guess these from memory; the APIs are new.

- **`references/project-setup.md`** — `ng new`, `package.json` version pins, `main.ts`,
  `app.config.ts`, `app.routes.ts`, folder layout, SSR/server setup. *Read first when creating a project.*
- **`references/components-di-reactivity.md`** — components, directives, pipes; the full signals
  API (`signal`, `computed`, `effect`, `linkedSignal`, `untracked`), signal inputs/outputs/models,
  signal queries (`viewChild`/`contentChild`), lifecycle, DI (`inject`, `@Service`, `injectAsync`,
  tokens, providers), and resources (`resource`/`rxResource`/`httpResource`/`debounced`).
- **`references/templates.md`** — control flow (`@if`/`@for`/`@switch`/`@let`/`@defer`),
  selectorless (and why it isn't usable in 22.0 yet), template spread, bindings, pipes, two-way binding with models.
- **`references/signal-forms.md`** — the flagship (STABLE): model signals, `form()`, validators, schema
  helpers (`apply`/`applyWhen`/`applyEach`), `validate`/`validateAsync`/`validateHttp`/`validateStandardSchema`,
  `FieldState`, `[formField]` binding, `submit()`, and the build-breaker gotchas.
- **`references/routing-http-ssr.md`** — routes, lazy `loadComponent`/`loadChildren`, functional
  guards/resolvers, component input binding, per-route render modes, `RouterLink` `browserUrl`;
  `provideHttpClient` (Fetch default), functional interceptors, progress; SSR + incremental hydration.
- **`references/testing-and-tooling.md`** — Vitest setup and examples, `TestBed`, `fakeAsync`
  polyfill, Karma→Vitest migration, CLI flags, build/optimize knobs.
- **`references/breaking-changes.md`** — the full v22 breaking-change list, deprecations, and an
  `ng update` migration map. *Read when upgrading an existing app.*
- **`references/version-history.md`** — the cumulative v17→v22 feature map (what landed when, with status).
  *Read when targeting v19/v20/v21, or to confirm whether a feature exists on the project's major.*

## Guardrails (avoid hallucinating)
- Always use **selector-based standalone components** — they are the only working model in 22.0.
  **Selectorless is not available yet** (prototype/RFC); never emit class-name-as-tag templates — they fail to build.
- `debounced()`, the Navigation API, and the WebMCP/AI tools are **experimental / developer-preview** in
  22.0 — flag that when suggesting them.
- **Not usable in 22.0.0 yet — don't emit** (verified they fail to build): **selectorless** components
  (class-name-as-tag), and the **`@boundary`** error block (announced for v22, dev preview targeted ~Q3 2026).
  For error handling today use the `ErrorHandler` service.
- Don't invent validator names or resource methods. If unsure, point to the matching reference file
  rather than guessing a signature.
- If the user's project is pre-v22 (check `package.json`), adapt: e.g. they may still use Karma,
  `*ngIf`, or `Default` change detection. Don't force v22-only syntax onto an older codebase.
