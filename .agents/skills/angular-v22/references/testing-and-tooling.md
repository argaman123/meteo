# Testing & Tooling (Angular v22)

## Vitest is the default test runner
New projects use **Vitest** (Karma + Jasmine are out). `ng test` runs Vitest via the
`@angular/build:unit-test` builder. Tests use Vitest globals (`describe`/`it`/`expect`/`vi`) plus
Angular's `TestBed`.

```ts
// counter.spec.ts — the CLI enables Vitest globals; do NOT import describe/it/expect from 'vitest'
// (importing them silently breaks fakeAsync — see the fakeAsync note below).
import { TestBed } from '@angular/core/testing';
import { Counter } from './counter';

describe('Counter', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [Counter] }));

  it('increments', async () => {
    const fixture = TestBed.createComponent(Counter);
    const cmp = fixture.componentInstance;
    cmp.increment();
    await fixture.whenStable();              // preferred over detectChanges() in zoneless apps
    expect(cmp.count()).toBe(1);
  });
});
```

### Testing signals & inputs
```ts
const fixture = TestBed.createComponent(Greeting);
fixture.componentRef.setInput('name', 'Ada');   // set a signal input
fixture.detectChanges();
expect(fixture.nativeElement.textContent).toContain('Ada');
```

### Services with HTTP
```ts
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

TestBed.configureTestingModule({
  providers: [provideHttpClient(), provideHttpClientTesting()],
});
const httpMock = TestBed.inject(HttpTestingController);
// … trigger a request, then:
httpMock.expectOne('/api/users/1').flush({ id: 1, name: 'Ada' });
httpMock.verify();
```

### fakeAsync in Vitest
`fakeAsync`/`tick`/`flush`/`waitForAsync` need Zone.js, which zoneless Vitest projects don't load.
To use them, add the Zone.js Vitest patch to the **test polyfills in `angular.json`** (not an import):
```jsonc
// angular.json → projects.<app>.architect.test.options.polyfills
"polyfills": ["zone.js", "zone.js/plugins/vitest-patch"]
```
Caveat: only Vitest **globals** are patched. If you `import { describe, it } from 'vitest'`, `fakeAsync`
won't work — rely on the global `describe`/`it`/`expect` instead. Angular now **recommends migrating
away** from `fakeAsync` toward native `async` + `await fixture.whenStable()` and Vitest's
`vi.useFakeTimers()`/`vi.advanceTimersByTime()`.

### TestBed.getLastFixture()
Retrieve the most recently created fixture without holding a reference:
```ts
const fixture = TestBed.getLastFixture<Counter>();
```

## Migrating an existing test suite
```bash
ng generate @angular/core:migrate-karma-to-vitest      # swap Karma config/builders for Vitest
ng generate @angular/core:refactor-jasmine-vitest --fake-async   # Jasmine→Vitest API rewrite
```

## CLI & build
- Dev server / port: `ng serve`, or `PORT=4203 ng serve`.
- Builder is esbuild-based (`@angular/build`). Webpack builders are deprecated.
- Chunk optimization is on by default; disable with env `NG_BUILD_OPTIMIZE_CHUNKS=0` if a build
  misbehaves.
- Subresource Integrity (incl. import maps for lazy chunks): set `"subresourceIntegrity": true` in
  the build options in `angular.json`.
- Common: `ng build` (prod), `ng build --configuration development`, `ng lint`, `ng update`.

## Upgrading to v22
```bash
ng update @angular/cli@22 @angular/core@22        # runs schematics/migrations automatically
```
The migrations handle most breaking changes (OnPush via `Eager`, optional-chaining wrapping,
`CanMatchFn` signature, etc.). After updating, review `references/breaking-changes.md` for the items
with **no** automatic migration (notably `paramsInheritanceStrategy`).

## E2E
Angular doesn't ship an E2E tool; use Playwright or Cypress as a separate dev dependency. (A
Playwright MCP is available in this environment for driving a running app if you need to verify
behavior in a browser.)
