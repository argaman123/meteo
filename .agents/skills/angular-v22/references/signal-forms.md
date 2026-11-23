# Signal Forms (Angular v22 — STABLE)

Signal Forms (`@angular/forms/signals`) graduated to public/stable API in v22 and are the **recommended**
form system for new code. They're typed, signal-driven, and model-first. Reactive & template-driven forms
from `@angular/forms` still exist for legacy code, but **do NOT mix** `FormControl`/`FormGroup`/`FormBuilder`
with Signal Forms — Signal Forms replace them and there is **no form builder**.

> The official `angular-developer` skill ships an even deeper `references/signal-forms.md` with an exhaustive
> pitfalls table. Consult it for edge cases; this file captures the essentials + the gotchas that break builds.

## The model (single source of truth)
1. Hold form data in a plain **model signal**. **Never use `null`/`undefined` as initial values** — use `''`
   for strings, `0` for numbers, `[]` for arrays, nested objects for groups (inputs can't accept `null`).
2. Build the form with `form(model, schemaFn?)`; structure is derived from the model shape.
3. Bind inputs with `[formField]`; read reactive **FieldState** anywhere.

```ts
import { Component, signal } from '@angular/core';
import { form, FormField, required, email, min } from '@angular/forms/signals';

interface Model { name: string; email: string; age: number; tags: string[]; }

@Component({ selector: 'app-signup', imports: [FormField], templateUrl: './signup.html' })
export class Signup {
  protected readonly model = signal<Model>({ name: '', email: '', age: 0, tags: [] });

  protected readonly f = form(this.model, (path) => {
    required(path.name, { message: 'Name is required' });
    required(path.email);
    email(path.email, { message: 'Invalid email' });
    min(path.age, 18, { message: 'Must be 18+' });
  });
}
```

## FormField (structure) vs FieldState (data) — CALL the field
A field node is a **FormField** (structural). **Call it as a function** to get its **FieldState** signals.
```ts
f.name              // FormField (structural) — has children, NO flags
f.name().touched()  // FieldState — call f.name() first, THEN read the signal
f().invalid()       // root FieldState (note the parens on the root)
f.address.city().errors()
f.tags.length       // array length: NO parentheses (structural)
```
Same in templates: `@if (f.email().invalid()) { … }` — call `f.email()` first, then read the signal.

## FieldState surface
```ts
const s = f.email();
s.value();     // WritableSignal of the field value
s.valid(); s.invalid(); s.pending();    // validity (pending = async validation in flight)
s.errors();    // ValidationError[]  ({ kind: string; message?: string })
s.touched(); s.dirty();
s.disabled(); s.readonly(); s.hidden();
s.getError('email');   // v22: fetch a specific error by kind (or undefined)
f().reset();           // reset touched/dirty (optionally pass a fresh model object)
```
To **set** a value, update the **model signal** — not the field:
`this.model.update(m => ({ ...m, name: 'Ada' }))`.

## Binding in templates — and FORBIDDEN attributes
`[formField]` wires value + `disabled`/`readonly`/`hidden`/`name` automatically. With `[formField]` you
**must NOT** also set `value`/`[value]`/`[attr.value]`, `[disabled]`, `[readonly]`, or `min`/`max`/`[attr.min]`/
`[attr.max]` on the same control (→ error **NG8022**) — use schema rules instead.
```html
<input [formField]="f.name" />
<input type="email" [formField]="f.email" />
<input type="checkbox" [formField]="f.isAdmin" />   <!-- checkbox binds to a BOOLEAN field only -->
<select [formField]="f.country"><option value="us">US</option></select>
<!-- Arrays: <select multiple [formField]="f.tags"> does NOT type-check (TS2322: string[] vs string,
     verified). For multi-value, use one boolean field + checkbox per option, or manage the array
     imperatively with (change). -->
<button [disabled]="f().invalid() || f().pending()">Save</button>
```

## Validators (from `@angular/forms/signals`)
`required, email, min, max, minLength, maxLength, pattern, minDate, maxDate`. Each takes the **path** plus an
options object (`{ message }`, or `{ error }` for a custom `ValidationError`).
```ts
required(path.name, { message: 'Required' });
minLength(path.password, 8);
pattern(path.zip, /^\d{5}$/);
minDate(path.born, new Date('1900-01-01'));   // date-only validators (v22)
```
**`when` works ONLY with `required`.** For conditional *other* validators, wrap them in `applyWhen`:
```ts
required(path.spouse, { when: ({ valueOf }) => valueOf(path.married) });   // OK
// pattern(path.ssn, /…/, { when }) ← ERROR — use applyWhen instead
```

## Schema helpers — disabled / readonly / hidden / apply / applyWhen / applyEach / schema
```ts
import { disabled, readonly, hidden, apply, applyWhen, applyEach, schema } from '@angular/forms/signals';

disabled(path.coupon, { when: ({ valueOf }) => valueOf(path.total) < 50 });
readonly(path.username);
hidden(path.shipping, { when: ({ valueOf }) => valueOf(path.sameAsBilling) });   // marks hidden; gate render with @if

const addr = schema<Address>((p) => { required(p.street); pattern(p.zip, /^\d{5}$/); });
apply(path.billing, addr);                                                  // apply a reusable schema to a subtree
applyWhen(path.spouse, ({ valueOf }) => valueOf(path.married), (sp) => required(sp.name));  // 3 ARGS
applyEach(path.lines, (line) => { required(line.sku); min(line.qty, 1); });  // ONE arg (no index param!)
```
The common build-breakers here:
- `applyWhen(path, condition, schemaFn)` — **3 arguments** (path first).
- `applyEach(path, item => …)` — **one argument** (the item path); there is no index parameter.
- Inside `form()`, **paths are NOT signals** — never call `path.x()`. Read other fields via the context's
  `valueOf` / `stateOf` (below).

## The rule context object
Functions for `validate` / `disabled` / `applyWhen` / etc. receive a context — destructure it precisely:
```ts
validate(path.username, ({ value, state, valueOf, stateOf, fieldTree, pathKeys }) => {
  // value()              → this field's value (Signal)
  // state                → this field's FieldState (state.touched(), state.dirty()) — NOT a bare touched()
  // valueOf(path.other)  → another field's value (tracks the dependency)
  // stateOf(path.other)  → another field's FieldState
  if (value() === 'admin') return { kind: 'reserved', message: 'Reserved name' };
  return undefined;   // valid → return undefined, NEVER null
});
```

## Async validation — validateAsync / validateHttp (`onError` is REQUIRED)
Both run only after sync validators pass.
```ts
import { resource } from '@angular/core';
import { validateAsync, validateHttp } from '@angular/forms/signals';

validateAsync(path.username, {
  params: ({ value }) => value(),                       // MUST be a function returning the value
  factory: (name) => resource({ params: name, loader: async ({ params }) => checkTaken(params) }),
  onSuccess: (taken) => (taken ? { kind: 'taken', message: 'Taken' } : undefined),
  onError: () => ({ kind: 'error', message: 'Validation failed' }),   // REQUIRED, not optional
});

validateHttp(path.email, {
  request: ({ value }) => `/api/check-email?email=${value()}`,        // a URL string or HttpResourceRequest
  onSuccess: (res) => (res.taken ? { kind: 'taken', message: 'Taken' } : undefined),
  onError: () => ({ kind: 'error', message: 'Could not validate' }),
  debounce: 400,                                                       // v22: debounce option
});
```
Standard Schema (Zod/Valibot, …): `validateStandardSchema(path, ZodSchema)`. Debounce model sync on typing
with `debounce(path.field, 300)`. (`metadata()` attaches arbitrary metadata to a field.)

## Submitting — submit() (callback MUST be async)
`submit()` marks all fields touched, runs validators, and runs your action **only if valid**.
```ts
import { submit } from '@angular/forms/signals';

onSubmit() {
  submit(this.f, async () => {            // MUST be async and return a Promise
    await this.api.save(this.model());    // only runs when the form is valid
  });
}
```
```html
<form (submit)="onSubmit(); $event.preventDefault()">
  …fields…
  <button [disabled]="f().invalid() || f().pending()">Submit</button>
</form>
```
Alternative: bind `<form [formRoot]="f">` and submitting the form auto-calls `submit()`. Register global
state CSS classes (`ng-invalid`/`ng-valid`) via `provideSignalFormsConfig({ classes: { … } })`. Migrate
reactive-forms code incrementally with `@angular/forms/signals/compat` (`SignalFormControl`, `compatForm`).

## Arrays & nested @for (there is NO `$parent`)
```html
@for (line of f.lines; track $index; let outer = $index) {
  <input [formField]="line.sku" />
  @for (tag of line.tags; track $index) {
    <button (click)="remove(outer, $index)">x</button>   <!-- store outer index in a let; no $parent -->
  }
}
```
Add/remove items by updating the **model array**: `this.model.update(m => ({ ...m, lines: [...] }))`.

## Build-breaker cheat sheet
| Wrong | Right |
|-------|-------|
| `f.field.valid()` | `f.field().valid()` (call the field first) |
| `f.invalid()` | `f().invalid()` (root needs parens) |
| `f.items().length` | `f.items.length` (structural — no parens) |
| `f.field.set(x)` | update the model signal instead |
| `({ touched }) => touched()` | `({ state }) => state.touched()` |
| `applyWhen(cond, fn)` | `applyWhen(path, cond, schemaFn)` (3 args) |
| `applyEach(items, (i, idx) => …)` | `applyEach(items, (item) => …)` (1 arg) |
| `pattern(p, /…/, { when })` | wrap in `applyWhen` (`when` is `required`-only) |
| `<input min="1" [formField]>` | `min()` rule in schema (else NG8022) |
| `validateAsync` without `onError` | `onError` is required |
| `return null` from a validator | `return undefined` |
| `<select multiple [formField]="f.tags">` (string[]) | per-option boolean checkboxes (multi-select fails TS2322) |
| `import { FormState }` | use `FieldState` (there is no `FormState`) |
| `signal({ name: null })` | `signal({ name: '' })` / `age: 0` / `tags: []` |
