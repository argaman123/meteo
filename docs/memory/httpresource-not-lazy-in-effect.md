---
name: httpresource-not-lazy-in-effect
description: Angular httpResource/resource cannot be created inside an effect (reactive context) — NG0602; create them eagerly
metadata: 
  node_type: memory
  type: reference
  originSessionId: 5361a6fa-abb4-4c08-a400-658d290fecb1
  modified: 2026-07-30T08:19:10.687Z
---

`httpResource()` / `resource()` internally call `effect()`, so creating one **inside a reactive context** (another `effect`, a `computed`) throws **NG0602** ("effect() cannot be called from within a reactive context"). `runInInjectionContext` does NOT help — it restores injection context, not reactive context.

Consequence: a resource must be created in a **non-reactive** context (injection-context field initializer, or an event handler), never inside the draw `effect`.

**Identity refetch loops (2026-07-30, multi-cadence):** httpResource re-runs its loader whenever the computed *request object* changes by Object.is — so a request fn reading a computed that returns a **fresh object each recompute** (TimeService.window) refetches on every upstream tick even when values are equal, and can form a silent infinite loop (resource resolves → sync effect sets a signal with a new array → window recomputes → "new" request → refetch; polygons hours never settled, `hasValue()` false forever, ZERO console output — guarded reads mean errors/loops are silent now). Fix: computeds that return objects and feed resource requests get a custom `equal` comparing values (`{ equal: (a,b) => a.start===b.start && a.end===b.end }`). Any time a request fn reads an object-returning computed, check its equality.

How meteo solved it (2026-06-25, lead-approved; now `layers/layers-service.ts` — `LayersService`, see [[one-service-per-domain]]): **lazy per-shown-layer feeds, consolidated into one service** that owns selection + fetch + draw (it uses the engine's `Overlay` adapter). It holds `enabledLayers = signal(Map<Layer, Signal<Grid>>)` — the **single source of truth** ("shown" = a key in the map; no separate active-Set). `toggle(layer)` from the layer-bar: `show` creates the layer's `httpResource` (a click = non-reactive → legal) and adds it to the map; `hide` `overlay.remove`s the looks and drops the entry (resource GC'd). `start()` seeds default-on layers. The draw `effect` is a plain **field** (construction = injection context → no injector needed) that reads `enabledLayers()` and each feed's value. The Injector is therefore needed in exactly **one** spot — `fetch()`, creating the resource on a click. Scales to 100s of layers (only the ~1 shown has a live resource). Each layer declares its own refetch triggers by which signals its `request(Inputs)` reads (reads `bbox()` → refetches on pan; reads nothing → static). See [[code-design-taste]].
