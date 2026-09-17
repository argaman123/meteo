---
name: code-design-taste
description: "The lead's standing code-design bar — minimal type surface, convert-on-receive, separate by real axis, classes for behavior, simplify hard, don't over-fragment"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: cd435a87-219e-440f-96c9-94316708c5ee
  modified: 2026-08-23T12:24:19.318Z
---

The lead expects this design quality **by default** (2026-06-16: "I expect this level of code later without having to repeat myself — though questions are always good"). Standing preferences, demonstrated across the Wrap/Grid rework:

- **Minimal type surface.** Collapse overlapping/redundant types. Inline a sub-object that's never used standalone instead of naming it. Fewest types that still read clearly (wire `Wrap` + internal `Grid`, `info` inlined; `VectorField` deleted).
- **Convert wire→internal at the boundary.** Parse the backend shape on receive (`httpResource` `parse` → `new Grid(wrap)`); hold only the internal object, don't let the wire type linger or get cached.
- **Separate by the real axis of variation, not an incidental one.** Sampling split by interpolation (`'bilinear' | 'nearest'`, caller's choice), NOT by component count. Never fuse orthogonal concerns.
- **Domain objects = classes with behavior.** Data + operations → a class (`Grid` with `constructor(wrap)` + `valueAt()`), colocated. Reserve plain-interface-in-`types/` + free-functions-in-`utils/` for genuinely inert data.
- **Simplify aggressively; push complexity out.** Drop machinery that only buys minor perf (removed `components:2` interleaving → two scalar grids; chose to ask backend for `u`/`v` rather than convert client-side).
- **Don't over-fragment.** No file for 2 tiny well-named functions (`mercator` → colocated in `engine/renderers/`). Folders neither too specific (`grid/` → `objects/`) nor too generic.
- **Change now, maybe again later.** Don't defer to "a later subject" — apply the agreed change immediately; revisit if needed.
- **Preserve behavior/look when refactoring** (frozen wind path stayed bit-identical: u/v emitted in m/s = same magnitude particles saw before).

Further, demonstrated across the 2026-06 ground-up code rebuild ("rehaul"):

- **Class instances over interfaces** for domain pieces. He will say "not a fan of interfaces, rather use class instances." Subclass where identity varies (`Temperature extends Layer`); construct a configured instance where only config varies (`new Colormap(palette, style)`).
- **Behavior as a method on the owning class**, not a free function beside it (`colormapImage` → a private `Colormap.image()` using `this.scale`). This holds **even for a pure helper that doesn't touch `this`** but is specific to one class — make it a private method, not a module-level function in the same file (`loadBasemapStyle` → a private `MapEngine` method, not a function below the class). Reserve `utils/` free-functions for genuinely shared, class-agnostic logic (`colorScale`, `mercator`).
- **Polymorphism over type-switching.** Let the object do its own thing via a method (`look.deckLayer(grid)`); avoid `instanceof`/`kind` branches in callers. Don't add a `kind` discriminant tag when classes already discriminate — it's "pointless" with class instances.
- **No mirror/wrapper objects.** Don't build a parallel hierarchy that shadows a library's and then translates (he rejected a `Renderable` that wrapped an image only to be unwrapped into a deck layer). The adapter exposes the primitives directly and higher layers compose them — one set of objects, not two. He framed the engine as "a sort of weatherlayers bundle" that *owns and exposes the look types*; the catalog just composes them.
- **Build the future's shape, simplified — NOT throwaway-then-grow.** Even with one parameter / one look now, use the structure it will grow into (`looks: Look[]`, looks owned by the engine). "Make it knowing what I want it to be later." But don't over-build either (he reverted the whole over-abstracted layer/look/value/registry attempt as "way too over complicated").
- **Use the best popular library, weighed for handoff.** Chose `d3-scale` over the more color-specific `chroma.js` *because* d3 is the one viz toolkit reused later (axes/legends/charts) — junior learns one mainstream thing. Don't reinvent (`colorFor` → d3 scale). But don't add premature machinery either (dropped a per-pixel LUT as unmeasured optimization for a one-shot colorize).
- **Angular idioms:** `httpResource` (reactive, signal-driven) over imperative `firstValueFrom`; state in small signal-stores (camera state → a `ViewStore`, off the engine).
- **`utils/` only for genuinely cross-domain helpers** (geo math, color scales). Single-use logic doesn't get a util file AND doesn't even get a sibling class in the same file — it inlines into the owning class (2026-07-05: `EvenScatter` went utils/scatter.ts → same-file class → fully inlined into `TrailCanvas.spawn()`; "merge it to the code itself, its only used once basically"). Extraction needs a *plausible second consumer today*, not a hypothetical one. Shared look-machinery with real generality goes to `engine/base/` (AnimatedLayer, GeoCanvas), not utils.
- **Bind values that live and die together into one object.** Two parallel nullable fields that are only ever set/read as a pair are one value — make them one field (2026-07-13: `lastGrid`+`lastImage` memo in `Colormap` → one `last` pair field; "bind the last grid and last image since they are both together"). His follow-up edit: absent-able fields use optional style `last?: {…} = undefined`, not `| null`.
- **Let concrete types flow; no cast helpers.** (2026-07-13, layer-bar) He deleted my `colormap(look)`/`particles(look)` template cast methods: the registry's instance types flow naturally (`Object.values(layers)` → `(Temperature | Wind)[]` → looks union) and `@switch (entry.look.kind)` narrows in the template. `$any()` is acceptable at a single genuine type-friction point (slider `$event`), preferred over helper indirection.
- **App policy stays out of domain services.** (2026-07-13) He deleted `LayersService.showDefaults()`, made `showLayer`/`hideLayer` public, and had the home page loop over the registry's `defaultActiveLayers` itself — the service exposes capabilities (verbs); which layers start active is the page's startup policy. Don't add one-caller convenience wrappers to services.
- **Built-in pipes over component formatting helpers.** (2026-07-13) My `percent()` method → `{{ (value * 100) | number:'1.0-0' }}%` with `DecimalPipe` imported. Prefer Angular's pipes in templates to tiny formatting methods.
- **Declarative definitions reference by enum, not resolved instance.** (2026-07-14, Shortcut) `parts.looks` shortened from resolved `Look` instances (via a `layer.look(kind)` accessor) to plain `LookKind[]` — the kind IS the identity; resolution happens where the state lives (service matches `look.kind` at apply time). The accessor became dead and was deleted.
- **No side-effect-only injectables.** (2026-07-14) He rejected `inject(LookSettings)` existing "just so it initializes" — a service whose only job is running its constructor is not a service. Use a plain function and call it, or better, eliminate the init step entirely.
- **Settings: one declaration, zero strings, zero boilerplate — identity from EXISTING ids only.** (2026-07-14, four iterations to land) Rejected in order: a central service enumerating the registry and instanceof-poking values ("generic"); a `settingsKey` string passed in definitions ("use existing ids"); a per-look `bindSettings` hook with a key field + explicit save calls ("specific to one variable, what if I have multiple"). Final: `readonly speed = setting(1)` — a WeakMap-marked WritableSignal whose set() auto-persists; the registry is constructed as `export const layers = registerLayers({ temperature: new Temperature(), … })` (his rename from my bindLookSettings) where `registerLayers` — exported by `utils/settings.ts`; he rejected a single-file `settings/` folder as "way too specific" — walks layers→looks, reflects over each look's fields, and derives storage keys `wind.Particles.speed` from registry key + LookKind name + FIELD name. Two placement corrections en route: a bare module-scope for-loop after the exports ("is it the standard way?" — no) and a registry-local `defineLayers` wrapper ("not doing anything that relates to defining layers — naming is off"). Lessons: he'll iterate an API until declaring a tunable costs one line and no identifiers; startup wiring folds into a construction expression, named for and owned by the module whose concern it implements.
- **Plain TypeScript over clever types.** (2026-07-14) Given Widen<T> (conditional type fixing literal inference) vs per-primitive overloads vs `any`: he rejected `any` (untypes call sites) and chose a plain generic `setting<T>` with **explicit type arguments where inference narrows** (`setting<number>(1)`, `setting<number | null>(null)`). Conditional/mapped-type tricks are too clever for the handoff bar — prefer an explicit annotation at the odd call site.
- **Compact spacing where possible.** (2026-07-13) He joins short argument lists onto one line (`SPEED_PALETTE, 'smooth', 0.55,`) even where Prettier would expand one-per-line — write new code compactly within line width, and NEVER blanket-run Prettier over the repo: my project-wide `prettier --write` undid his manual compaction and he had to redo it. Format only the lines I author.
- **Same shape = same interface; names carry semantics, not new types.** (2026-07-21, ForecastPolygon) Wire polygon and runtime clipped area had identical structure with different field names — he merged them into ONE shared interface: "they are functionally the same type; it's like having two ints and saying one should be a different type because its value is different — that's what names are for." Semantic differences (lat,lon vs lon,lat order, clipped vs raw) are expressed by variable/field NAMES and explicit named conversion functions (`latLonToLonLat` — he wants conversions obvious, a dedicated function, not an inline lambda), never by duplicating a structurally identical type.
- **No pass-through util calls.** A shared function called with arguments it ignores is empty indirection — cut the call, do the trivial thing inline at the call site (2026-07-08: `format(level, unit, 'bare')` ignored the unit → "the format util function is useless… they are almost always used once, move them to the layers"; label formatting became inline `String` in each layer). Promote to a static on the owning class only when reuse actually appears.

From the polygons-feature review marathon (2026-07-19→22, his explicit "remember every single change" list):

- **Function names state the ACT + what returns**: create/calc/find/filter/is prefixes (`createLinePattern`, `calcLabelPosition`, `createLabelIcon`, `createInnerBorders`, `createPointsInside`, `isInsidePolygon`). Rejected as "weird": rim, hatch, scanlines, homeAnchor, candidatePoints, inRing, edgeDistance, pullInside, ringArea, centroid, anchor/home, `icon()` ("too broad"). Data names say what the thing IS (`ColoredLine` not StyledLine; `position`/`preferredPosition` not anchor/home). Ask of every name: "what does it even do?"
- **Premade library over hand-rolled for anything standard** ("is there not an existing function? seems basic"): turf `centerOfMass`/`booleanPointInPolygon` replaced my shoelace/raycast; Mapbox `polylabel` replaced my interior-point sampler. Hot-loop exception (60fps) still stands; per-settled-event code may allocate GeoJSON freely.
- **Simplicity beats niche upgrades — strip and shelve with a revival note**: removed bisection pull-back (snap-to-home instead), per-type patternWidth, unused enum members, icon/glyph fills ("looks cool, not needed right now"), leader lines ("not even visible"), the whole linked-hover mechanism ("looks very good but too much boilerplate — move it aside"), the per-control `always` flag (redo at layer level later). Shelved things get a plan.md note with the revival design since uncommitted code leaves no history.
- **No speculative guards**: closeRing stripped — "it used to work before... if I see an error on the live build I'll return it back"; instead make the FIXTURE mirror the real format (closed rings). "No need to add extra things now that are not necessarily needed."
- **Machinery-of-one lives beside its feature, not in base/**: PolygonsLayer moved from layers/base/ to layers/polygons/ importing its own records directly (he then moved ModelLayer into model/ himself); base/ keeps only truly shared pieces. Records (EVENT_APPEARANCES, SECTORS) merged INTO the layer file — "why does the layer request stuff from the registry??"; constructor-injection through the registry rejected. When code feels "bundled and scrambled," in-file grouping (class → geometry groups) sufficed over a file split.
- **Contract/dispatch shape**: dispatchable kinds = classes implementing a small interface, keyed by wire `type` in a record; NESTED modifiers = plain functions, not classes. Nested styling composes by **passing the style down and letting each modifier mutate its parts** (`applyPrecip(style, precip)` → internally `applyCb(style, cb)`) — code nesting mirrors data nesting; derive context from the object being decorated (cb reads the cloud's alpha off `style.fill[3]`).
- **Tunables as defaulted parameters, not module consts** (`spacing = 0.12` on the generator, PATTERN_SPACING const deleted).
- **Nullability is absorbed at the seam that owns the invariant**: Inputs.zoom() made non-null in LayersService (`?? 0`) since no consumer branches on null; bbox stays `| null` because null MEANS "don't fetch yet". Fields guaranteed-by-sequence use definite assignment (`private on!: Inputs`) once, not `?.`/`??` per use.
- **Looks are pure functions of their input**: engine context params rejected twice (LookView with refresh() — "boilerplate"; bare zoom param — "not a fan of how zoom is passed around"). Everything a look needs rides its provider-built input; camera state flows through `Inputs` (zoom like time/bbox), with layer stashing `on` in fetch.
- **Old-app vocabulary wins for domain names**: `EventAppearance` (their ForecastEventAppearanceHandler), border/outline, `eights` (their spelling), `PolygonsView` over Scene. Closed value sets are enums like `Parameter` (`Sector`).
- **He edits files mid-review constantly** — check for on-disk changes before every edit, adopt his renames (flipCoordinates, createView, displayOrder), never revert. And NEVER run PowerShell -replace on files with non-ASCII text (it mangled Hebrew reading UTF-8 as ANSI; Edit tool only).
- **Framework API visible at call sites over bespoke micro-wrappers** (2026-07-29, multi-cadence review): he cut my `loadedValue(resource)` helper — "just like you check if loadedValue is undefined you could check if a resource has a value" — call sites now write `resource.hasValue() ? resource.value() : undefined` directly. A wrapper that merely renames a standard framework idiom hides the API a junior must learn anyway; only wrap when policy is added, not spelling.
- **Effects declared at the top of the class, next to the state fields** (2026-07-30): "effects must be at the top near the variables since they are a crucial part and run stuff in the background" — never bury an effect field at the bottom of a service; all effects group together right after the signals/inputs they watch, so a reader sees the class's background machinery immediately.
- **Platform idioms over invented vocabulary — escalates until nothing bespoke remains** (2026-07-29, same review): my OUT_OF_RANGE Symbol + `Fetched<D>` alias died in three rounds — he renamed to MISSING_VALUE, then rejected `LayerData<D>` too: "it feels like something that should already exist, like a promise or an optional." Final: plain `Signal<D | null | undefined>` with JS's own convention (undefined = not yet, null = deliberately nothing) — the Coordinates layer changed from `Layer<null>` to `Layer<true>` to free null. When a concept smells standard, FIND the platform's existing expression before inventing types; a name he has to learn is a cost even when accurate. Also his: always-relevant `relevanceOf` returns `true` (`TimeRange | true`), not null/none.
- **A few plain lines beat a generic util — even a small one** (2026-08-04, satellite params guard): offered a 5-line `whenPresent<T>` (mapped-type NonNullable, cast) to dissolve the read-locals/null-checks/build-object dance; he declined: "for some reason I see it more complicated than actually seeing the original code have a few more lines." Visible read→check→copy plumbing at the call site outranks a type-level combinator, regardless of how small the util is. Same family as the Widen<T> rejection and `loadedValue` deletion — reach for explicit lines first, generics only when he asks.
- **UI-vocabulary descriptors: typed variants, never a mode boolean** (2026-07-22, second occurrence — controls' `list` boolean → `OptionsPresentation` enum, then legends' `gradient` boolean → `Legend = GradientLegend | SwatchesLegend` discriminated by a `LegendType` enum): "in case I need something extra or a custom UI in the future." A two-way rendering switch is still a set of KINDS — give each kind its own named type from the start so a future kind can carry extra fields. (Note the boundary with the earlier "no kind tag on classes" rule: class hierarchies discriminate by instanceof/polymorphism; plain-data descriptors rendered by template switches get an enum discriminator like ControlType/LegendType.) When he asked "why not a class for legends?" he accepted the interface rationale — inert stops data, tag needed for the template switch either way — and chose interfaces even though it leaves `gradientBackground()` as a component helper; descriptor vocabularies stay plain data unless real behavior accumulates.

**Why:** code quality is his #1 priority and he's teaching his taste to avoid repetition. **How to apply:** propose at this bar from the first draft, not after he corrects me; questions up front are still welcome. See [[design-first-concise]], [[breathing-tree-rule]], [[flag-unconventional-choices]].

2026-08-18 concrete instance (his call-out: "what the hell is rasterstyle and why is it almost a
duplicate of colormapoptions"): when extracting a shared function from a class, do NOT invent an
internal params-bag interface that near-duplicates an existing public options shape — pass plain
positional arguments (or reuse the existing shape via Pick). A second, slightly-different bag for
the same fields is type-surface bloat he will always reject.

2026-08-18, const placement: "i dont like having consts this far from classes... having them
above interfaces making them never even be seen." Rule: single-user const → private readonly
field of that class; multi-user const → directly beside its users, never stranded at file top
above the interfaces. (Exception stands: wind-particles' documented tuning-knobs block.)

2026-08-23: dynamic per-instance state on a class contract = a Signal field, never a getter. I
made Look.legend a getter (with private-field conversions in three subclasses AND an eslint rule
exception to make it fit) — he spotted it in a glance: "why is there not a cleaner solution?"
The signal version deleted the boilerplate and the eslint exception. When a design needs an
eslint exception to exist, that's the smell.

2026-08-23, observations follow-up ("a tonnn of code all stuffed in one place. split the code to
different parameters. thats why the folder exists"): when a layer folder exists for per-kind
files (polygons model), a growing in-class table of kinds must split into one file per kind
WITHOUT waiting to be asked — the folder's existence IS the standing instruction. And: derived
state over a STATIC table (scales, legends) is computed once at module load in the kind's own
file, never lazily cached at runtime (my per-parameter legend Map + currentLegend() → precomputed
`legend` field on each parameter const; identity stability falls out for free). Lazy caching is
for data that arrives at runtime, not for tables authored in source.

2026-08-23, same review: "gradientlegend function shouldnt be there. if its generic it should be
written and used outside" — a generic helper must never be exported from a feature file for
siblings to import; it moves to shared ground beside the type it builds (gradientLegend →
engine/base/look.ts next to Legend/LegendType). Placement rule: generic ⇒ lives with its
vocabulary, feature-specific ⇒ lives in the feature. A feature file exporting utilities is a
smell either way — either the util is generic (move it out) or the design is wrong.

2026-08-23, same review ("why base is a general parameter of the obs interface?"): a kind-specific
wire field must not widen a shared wire contract — the kind's own type extends the base point
(CloudPoint extends ObservationPoint in types/, the types/polygons.ts precedent) and the kind's
code casts at its one friction point. Never park an optional field on the general interface just
because one variant carries it.

2026-08-23, same review ("i dont understand the wording on scale describe wire. you got to work
on your naming"): wire→`parameter` (his "isnt it parameter?" — the request's query param is
literally named parameter; name a field by what the wire itself calls it, not by meta-vocabulary
like "wire"), scale→colorOf→**`colorScale`** (his final: "lets do colorScale everywhere" — when
a concept already has an established name (type ColorScale, builder colorScale), every field and
param takes THAT name; full one-concept-one-name beats accessor-style variety), describe→`textOf`.
The -Of accessor pattern is his blessed shape
for cheap point→value reads (textOf(point)). Bare verbs (describe) and bare
generic nouns (scale, wire) fail his "what does it even do?" test — I should self-apply this bar
before he has to ask. Also: names too GENERIC for their spot fail too (frameRequest → obsRequest
— he wants the domain in the name); "obs" is lead-accepted shorthand (flagged against the
no-abbreviations rule 2026-08-23, he kept it); framework option names (resource's `params`) are
never re-spelled, and a big function gets split before its locals need clever names.

2026-08-23, same review ("it should be computed dont it?"): a private helper method that only
derives a value from signals (currentParameter's string→object lookup off the persisted control)
becomes a `computed` field, not a method — extends the legend Signal-over-getter lesson from
contract fields to internal derivations. Call sites don't change (a computed is called like the
method was); declare it beside the state it derives from.
