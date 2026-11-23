# Components, Dependency Injection & Reactivity (Angular v22)

## Components
Default to standalone, selector-based, OnPush (implied). Use `imports` for what the template uses.
```ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { UserCard } from '../shared/user-card';

@Component({
  selector: 'app-users',
  imports: [UserCard],
  templateUrl: './users.html',
  styleUrl: './users.scss',
  // changeDetection defaults to OnPush in v22. To restore check-always:
  // changeDetection: ChangeDetectionStrategy.Eager,
})
export class Users {}
```
- `standalone: true` is implied — don't write it. Only `standalone: false` (for legacy NgModule
  declarations) is meaningful.
- `ChangeDetectionStrategy.Default` is **deprecated**; use **`Eager`** for the old check-always behavior
  (both still compile — `Default` is an alias of `Eager`). Omitting `changeDetection` now gives **`OnPush`**.
- Host bindings via the `host` object: `host: { '[class.active]': 'isActive()', '(click)': 'onClick()' }`.
  **Do NOT use `@HostBinding`/`@HostListener` decorators** — use this `host` object instead.
- **Static images:** use `NgOptimizedImage` — `<img ngSrc="hero.png" width="800" height="400">` — not a plain
  `src` (and never for inline base64). **Class/style:** use `[class.x]`/`[style.x]` (or object `[class]`/`[style]`),
  never `ngClass`/`ngStyle`.

## Signals — the reactive core
```ts
import { signal, computed, effect, untracked, linkedSignal } from '@angular/core';

const count = signal(0);
count();                       // read
count.set(5);                  // write
count.update(n => n + 1);      // derive from current

const double = computed(() => count() * 2);   // memoized, read-only

effect(() => {                 // runs when read signals change; for side effects only
  console.log('count is', count());
});

// untracked: read without creating a dependency
effect(() => { log(count(), untracked(() => double())); });

// linkedSignal: writable signal that resets when its source changes (v19+, stable)
const items = signal<string[]>(['a', 'b']);
const selected = linkedSignal(() => items()[0]);   // resets to items()[0] when items changes
selected.set('b');                                 // but is independently writable
// Object form when you need previous value:
const choice = linkedSignal({
  source: items,
  computation: (list, prev) => list.includes(prev?.value ?? '') ? prev!.value : list[0],
});
```
Rules of thumb: derive with `computed`, not `effect`. Use `effect` only for DOM/logging/3rd-party side
effects. Never `.set()` inside a `computed`. There is **no `mutate()`** — use `set`/`update` with immutable
updates (e.g. `items.update(a => [...a, x])`).

## Signal inputs / outputs / models (component I/O)
```ts
import { input, output, model } from '@angular/core';

readonly value = input(0);                        // optional, default 0  → InputSignal<number>
readonly id = input.required<string>();           // required (no default)
readonly label = input('', { alias: 'aria-label' });
readonly ms = input(0, { transform: (v: string | number) => Number(v) });

readonly changed = output<number>();              // OutputEmitterRef
emit() { this.changed.emit(this.value()); }

readonly checked = model(false);                  // two-way: [(checked)] in parent
toggle() { this.checked.update(c => !c); }
```
Inputs are read-only signals; never reassign them. `model()` creates a writable signal usable with
banana-in-a-box `[(x)]` binding.

## Signal queries (replace @ViewChild/@ContentChild)
```ts
import { viewChild, viewChildren, contentChild, contentChildren, ElementRef } from '@angular/core';

readonly box = viewChild<ElementRef<HTMLDivElement>>('box');   // Signal<ElementRef | undefined>
readonly reqBox = viewChild.required('box');                   // Signal<ElementRef>
readonly tabs = viewChildren(Tab);                             // Signal<readonly Tab[]>
readonly projected = contentChild(Header);
```
Read query results in `computed`/`effect` or `afterRenderEffect` — they populate after render.

## Lifecycle
Prefer signals + `computed`/`effect` over lifecycle hooks. When you need hooks:
`ngOnInit`, `ngOnDestroy`, `ngOnChanges` (for setter-style/decorator inputs only — signal inputs
don't use it), `ngAfterViewInit`, `ngAfterContentInit`. For render-timing work in zoneless apps use
`afterNextRender(() => …)` and `afterRenderEffect(() => …)` from `@angular/core` (browser-only,
safe for DOM measurement). Use `DestroyRef` + `inject(DestroyRef).onDestroy(fn)` for cleanup.

## Dependency Injection
Use the `inject()` function, not constructor parameters.
```ts
import { inject, Injectable, InjectionToken } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LegacyService {}

// v22 shorthand for the line above:
import { Service } from '@angular/core';
@Service()
export class UserService {
  private http = inject(HttpClient);
  byId(id: string) { return httpResource<User>(() => `/api/users/${id}`); }   // httpResource: @angular/common/http
}
// Options: @Service({ autoProvided: false })  → NOT auto-provided; you must list it in a providers array.
//          @Service({ factory: () => makeUserService() })  → create the instance via a factory function.

// Tokens for non-class deps:
export const API_URL = new InjectionToken<string>('API_URL');
// provide in app.config.ts: { provide: API_URL, useValue: '/api' }
const apiUrl = inject(API_URL);

// Optional / host / self modifiers:
const maybe = inject(SomeService, { optional: true });   // Service | null
```
Provider forms in `providers: [...]`: `useClass`, `useValue`, `useExisting`, `useFactory` (with
`deps`), and `multi: true` for multi-providers. Functional providers like `provideHttpClient(...)`
are preferred over importing provider modules.

### injectAsync — lazy-load a service (`@publicApi 22.0`)
`injectAsync(loader, options?)` defers loading a service until first use. The loader returns a
`Promise<ProviderToken>` (typically `import().then(m => m.ServiceClass)`); the call returns a **function
you `await`** to get the instance. Signature:
`injectAsync<T>(loader: () => Promise<ProviderToken<T>>, options?): () => Promise<T>`.
```ts
import { Component, injectAsync, onIdle } from '@angular/core';

@Component({ selector: 'app-report', template: `<button (click)="exportReport()">Export</button>` })
export class Report {
  // Lazily load + inject ReportExporter; optionally prefetch it when the browser is idle:
  private exporter = injectAsync(
    () => import('./report-exporter').then(m => m.ReportExporter),
    { prefetch: onIdle },                       // or { prefetch: () => onIdle({ timeout: 100 }) }
  );
  async exportReport() {
    const exporter = await this.exporter();     // service resolved + injected on demand
    exporter.export();
  }
}
```
Call it in an injection context (field initializer/constructor). Ideal for code-splitting heavy services
(PDF/Excel generators, charting libs) out of the initial bundle.

## Resources — async data as signals (stable in v22)
A `resource` ties an async loader to reactive request inputs and exposes signal state.
```ts
import { resource } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';   // rxResource lives in rxjs-interop, NOT core
import { httpResource } from '@angular/common/http';        // httpResource lives in common/http, NOT core

// httpResource: declarative HTTP GET driven by signals (uses HttpClient under the hood)
readonly userId = signal(1);
readonly user = httpResource<User>(() => `/api/users/${this.userId()}`);
// reactive state signals:
this.user.value();      // User | undefined
this.user.hasValue();   // boolean
this.user.isLoading();  // boolean
this.user.error();      // unknown
this.user.status();     // 'idle' | 'loading' | 'reloading' | 'resolved' | 'error' | 'local'
this.user.reload();     // re-fetch

// Request-object form (headers/params/method/body) + a default value; return `undefined` from the
// reactive fn to SKIP the request until inputs are ready:
readonly q = signal('');
readonly results = httpResource<Item[]>(
  () => this.q() ? { url: '/api/search', params: { q: this.q() } } : undefined,
  { defaultValue: [] },
);

// resource: custom async source. `params` re-runs the loader when it changes.
readonly detail = resource({
  params: () => ({ id: this.userId() }),
  loader: async ({ params, abortSignal }) => {
    const res = await fetch(`/api/users/${params.id}`, { signal: abortSignal });
    return (await res.json()) as User;
  },
});

// rxResource: when the loader is naturally an Observable
readonly stream = rxResource({
  params: () => this.userId(),
  stream: (id) => this.api.getUser$(id),   // returns Observable<User>
});
```
Resources auto-abort superseded requests via `abortSignal`. Read `.value()` in the template with
`@if (user.hasValue()) { … user.value() … }`.

### debounced() — EXPERIMENTAL (verify before production)
`debounced()` in `@angular/core` returns a **`Resource`** (NOT a plain signal) whose value reflects
the source signal after it stops changing for the delay. It is **experimental** ("ready to try, but it
might change"). Read it with **`.value()`** and check **`.status()`** — status is `'loading'` while the
debounce timer counts down. Pass the **signal itself** plus the delay in ms.
```ts
import { signal, debounced, resource } from '@angular/core';

readonly query = signal('');
readonly debouncedQuery = debounced(this.query, 300);   // Resource<string>, NOT debouncedQuery()
// drive another resource off the settled value:
readonly results = resource({
  params: () => this.debouncedQuery.value(),             // read with .value()
  loader: ({ params }) => fetchResults(params),
});
// optional 3rd arg: { equal, injector }. A function form exists for custom debounced loaders.
```
Note: there is a *separate* `debounce`/`Debouncer` in `@angular/forms/signals` for debouncing form
field updates — don't confuse the two (see `signal-forms.md`).

## RxJS interop (when you do need streams)
```ts
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
readonly user = toSignal(this.user$, { initialValue: null });
readonly id$ = toObservable(this.userId);
```
`takeUntilDestroyed()` (from `rxjs-interop`) auto-unsubscribes when the injection context is destroyed.

## Directives & Pipes (standalone)
```ts
import { Directive, input, inject, ElementRef, effect } from '@angular/core';
@Directive({ selector: '[appHighlight]' })
export class Highlight {
  private el = inject(ElementRef<HTMLElement>);
  color = input('yellow', { alias: 'appHighlight' });
  constructor() { effect(() => this.el.nativeElement.style.background = this.color()); }
}

import { Pipe, PipeTransform } from '@angular/core';
@Pipe({ name: 'truncate' })           // pure by default
export class Truncate implements PipeTransform {
  transform(v: string, max = 20): string { return v.length > max ? v.slice(0, max) + '…' : v; }
}
```
Add to a component's `imports: [Highlight, Truncate]` to use.
