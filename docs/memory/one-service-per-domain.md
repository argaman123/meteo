---
name: one-service-per-domain
description: "Architecture — no stores layer; one @Service per domain owns its signals + logic + its library, where it belongs"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5361a6fa-abb4-4c08-a400-658d290fecb1
---

Decided 2026-06-29 after a long design spiral + a lookup of the standard. **There is no `stores/` layer.** The mainstream Angular pattern (confirmed by the official `ngx-maplibre-gl` `MapService`, and the signals/SignalStore consensus) is: **one injectable `@Service` per domain that co-locates its state signals, its public methods, and the library it wraps** — state and the logic that mutates it live together, in the folder the domain belongs to.

- **`engine/map-service.ts` — `MapService`**: owns the maplibre `Map` instance + camera signals (`bbox`/`settledBbox`/`zoom`/`cursor`) + `basemap`/`basemaps` + methods `init`/`destroy`/`setBasemap`/`flyTo`. maplibre is imported **here** (this service IS the library boundary) — §4.1 loosened from "only `engine/`" to "the map service owns maplibre." Heavy bits can be private methods/plain helpers it calls.
- **`layers/layers-service.ts` — `LayersService`**: owns `enabledLayers` signal + `toggle`/`isShown`/`start` + the lazy `httpResource` feeds + the draw `effect` (via `Overlay`). Reads `MapService.settledBbox`.
- Components inject these directly (`home-page` → `MapService` + `LayersService`; `layer-bar` → `LayersService`). One inject gives signals AND functions — never split a domain into a data-service + a functions-service.

**Watch (lead, 2026-07-14):** `LayersService` "is growing a little, but for now is ok, let's keep an eye" — after multi-layer stacking it owns layer+look activation, colormap exclusivity, shortcut apply/derive, fetch feeds, the draw effect, and time-window sync. When it next grows, proactively propose a split ([[breathing-tree-rule]]) — natural seams: fetch machinery vs activation state vs shortcut logic.

**Killed en route (don't reintroduce):** a separate `ViewStore`/`MapStore` mirror; passing the store into `engine.init` as a sink; a `MapState`/`CameraSink` duplicate interface; signal forwarding; command-as-signal for `flyTo`. All were symptoms of splitting a thing the standard keeps whole. `flyTo` is just a method that calls `this.map.flyTo` — the service owns the map, so no bridge is needed. Lead is fine with plain (non-readonly) public signals. See [[httpresource-not-lazy-in-effect]], [[code-design-taste]], [[match-proven-look-exactly]].
