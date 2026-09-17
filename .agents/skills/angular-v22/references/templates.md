# Templates (Angular v22)

## Built-in control flow (use this, not `*ngIf`/`*ngFor`/`*ngSwitch`)
Structural directives still compile, but native control flow is the default and is faster.

### @if / @else if / @else
```html
@if (user(); as u) {
  <p>{{ u.name }}</p>
} @else if (loading()) {
  <p>Loading…</p>
} @else {
  <p>No user.</p>
}
```

### @for (track is REQUIRED)
```html
@for (item of items(); track item.id; let i = $index, isFirst = $first) {
  <li>{{ i }}: {{ item.name }}</li>
} @empty {
  <li>No items.</li>
}
```
`track` is mandatory — use a stable unique key (`item.id`), or `track item` / `track $index` only
when items are primitives or never reorder. Context vars: `$index`, `$first`, `$last`, `$even`, `$odd`, `$count`.

### @switch (with v22 enhancements)
```html
@switch (status()) {
  @case ('active') { <span>Active</span> }
  @case ('archived') { <span>Archived</span> }
  @default { <span>Unknown</span> }
}
```
v22 additions:
- A single block can match multiple values via **consecutive (fall-through) `@case`** blocks — there is
  **no comma syntax**:
  ```html
  @case ('active')
  @case ('pending') { <span>Active or pending</span> }
  ```
- **Exhaustiveness checking** for union types — end with `@default never;` so that adding a new union
  member without a matching `@case` becomes a compile error. For a discriminated union, name the checked
  expression explicitly: `@default never(status());`.

### @let — local template variables
```html
@let fullName = user().first + ' ' + user().last;
@let total = cart().reduce((s, i) => s + i.price, 0);
<p>{{ fullName }} owes {{ total | currency }}</p>
```
`@let` is read-only and reactive; it can reference signals, pipes, and other `@let`s.

### @defer — lazy rendering
```html
@defer (on viewport; prefetch on idle) {
  <heavy-chart [data]="data()" />
} @placeholder (minimum 500ms) {
  <div class="skeleton"></div>
} @loading (after 100ms; minimum 1s) {
  <spinner />
} @error {
  <p>Failed to load.</p>
}
```
Triggers: `on idle`, `on viewport`, `on interaction`, `on hover`, `on timer(2s)`, `on immediate`,
or `when <expr>`. Combine with `prefetch on …`. v22 also accepts an idle timeout, e.g. `on idle(500ms)`.

### @boundary — error boundaries (ANNOUNCED for v22, but NOT in 22.0.0 yet)
Angular announced `@boundary` as the error-boundary block for v22 — wrap a subtree so a child error renders a
fallback instead of crashing the page. But it is **developer preview targeted ~Q3 2026 and is NOT in the
22.0.0 release** (verified empirically: the block below fails to compile on 22.0 with `NG5002`, and the
compiler has no support for it). **Don't emit it for current 22.0.x code** — for error handling today use the
`ErrorHandler` service + `provideBrowserGlobalErrorListeners()`. Planned shape, for when it lands in a 22.x minor:
```html
@boundary {
  <risky-widget [data]="data()" />
} @error (let err) {
  <p class="error">Widget failed: {{ err }}</p>
}
```

## Bindings
```html
<!-- property / attribute / class / style -->
<img [src]="url()" [attr.aria-label]="label()" [class.active]="isActive()" [style.width.px]="w()" />
<!-- class & style objects -->
<div [class]="{ active: isActive(), error: hasError() }" [style]="{ color: color() }"></div>
<!-- events -->
<button (click)="save()" (keydown.enter)="save()">Save</button>
<!-- two-way with model() inputs or ngModel -->
<app-toggle [(checked)]="enabled" />
<input [(ngModel)]="name" />              <!-- needs FormsModule in imports -->
```

### Template spread (v22)
Spread object/array literals and use rest/spread in calls within templates:
```html
<app-widget [config]="{ ...defaults(), ...overrides() }" />
<app-list [items]="[...pinned(), ...rest()]" />
{{ formatName(...nameParts()) }}
```

### Comments inside element tags (v22) — use `//` and `/* */`, NOT `<!-- -->`
v22 adds support for **JavaScript-style comments between attributes inside an element's opening tag**
(this was a parse error before). HTML `<!-- -->` comments still work in element *content* but cannot go
inside a tag. Verified against a real v22 build (compiles cleanly):
```html
<input
  // single-line comment between attributes
  [value]="query()"
  /* block comment between attributes */
  type="search"
/>
<div>
  <!-- HTML comments still work here, in element content -->
  {{ value() }}
</div>
```

### Optional chaining now yields `undefined` (v22 change)
`{{ user()?.address?.city }}` evaluates to `undefined` (was `null` pre-v22), matching TypeScript.
Adjust any template logic that compared against `null`. (Migration wraps affected expressions for review.)

### More expression power (v21.2+ / v22)
- **`instanceof` in expressions**, with type narrowing:
  ```html
  @if (event instanceof MouseEvent) { <p>X: {{ event.clientX }}</p> }
  ```
- **Inline arrow functions** in bindings — handy for parameterized handlers:
  ```html
  @for (item of items(); track item.id) {
    <button (click)="remove((x) => x.id === item.id)">Remove</button>
  }
  ```
- **Type narrowing without `?.`**: after an `@if (user()?.isMember)` guard, `user().isMember` is type-safe
  inside the block.

## Selectorless components — NOT available in v22.0 (do not use)
Selectorless (referencing an imported component **class** directly as a template tag, e.g. `<UserCard />`
with no string selector) is a much-hyped idea, but it is **still in early prototype / RFC stage and does
NOT ship in Angular 22.0**. Verified empirically against a real v22 build: a class-name tag fails with
`NG8001: 'UserCard' is not a known element` — *even when the class is listed in `imports`* (you also get
`NG8113: All imports are unused`). So for v22:
- **Always give components a `selector`** and use that selector in templates (`<app-user-card />`).
- **List components in the consumer's `imports` array** and reference them by selector.
Watch the official RFC if you want this later, but do not emit class-name-as-tag templates for v22 — they
will not build.

## Pipes in templates
Common built-ins: `date`, `currency`, `number`, `percent`, `json`, `slice`, `keyvalue`, `async`,
`uppercase`/`lowercase`/`titlecase`. The `async` pipe is rarely needed now — prefer signals or
`toSignal()`. Pipes must be in the component `imports` (e.g. `imports: [DatePipe, CurrencyPipe]`).
