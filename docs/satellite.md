# Satellite layer — full feature record

> The complete record of the satellite feature: the wire contract, every decision the lead made,
> every correction, and the full animation saga (built, iterated, and deliberately stripped
> 2026-08-02 for a clean retry). **Read this before re-attempting the animation.** The current
> code state is static v1: the newest fetched frame drawn as one image.

## Wire contract (lead + backend lead)

- `getConfiguration` — **always returns something**: the default `channel`, default `sector`, and
  the **id of the satellite that should currently be displayed**. The user never sees or picks a
  satellite — the backend decides; the user shouldn't know or care.
- Bounds are **not attached to images**. They are requested **once, on the first click of the
  button**: the answer maps **every satellite × every sector → bounds**.
- Hours: ask for the times available **in the last 30 minutes**, by chosen channel + sector +
  the configured satellite id.
- Then **one image request per time**. Currently **2 satellites** exist.
- Cadences are 5/10/15 min per satellite; imagery is past-only ("latest ~30 min" asks).

## Client behavior (all lead-decided)

- **Controls**: ערוץ (channel) and גזרה (sector) — each has an **אוטו** choice that follows the
  server configuration default; explicit choices override. Presentation is **Select** (popup list;
  Table row of buttons was tried first and rejected — "the buttons on the menu should be selection
  menu"). Channels: IR (black-and-white) + **צבעוני** (wire `colorful`; originally "DUST", lead
  renamed it when the fixture began reusing one real image for both channels — IR is its
  grayscale). Config default channel = IR (a "switch to colorful by default" was briefly built on
  a misread and reverted).
- **Opacity**: the תמונה look carries a `percent(1)` control — same recipe as the colormap.
- **Startup shows the satellite layer** (lead: "use that layer by default instead of weather
  shortcut so I could see it") alongside coordinates.
- **Both channels are histogram-equalized before display** — `equalize` in `utils/image.ts` is a
  port of the old app's `imageDataEqualization` (lead's photo, 2026-08-03): histogram of the red
  channel, **bins 0 and 255 excluded from the CDF mass** (space-black / saturated-white don't skew
  the stretch), endpoints pinned 0→0 / 255→255, floored CDF as the LUT. One deliberate deviation:
  the old app writes `lut[red]` to r=g=b (its imagery is grayscale); ours applies the LUT per
  channel so the color channel stays colored — identical output on grayscale input. The
  the original values survive only as `SatelliteFrame.grays` — a 1-byte-per-pixel gray channel,
  kept **for IR frames only** (lead 2026-08-06: full RGBA `ImageData` per frame cost ~36 MB × 4
  frames on the wide loop, and צבעוני never reads originals; hover's absence check IS the channel
  check now).
- **IR hover**: temperature from the ORIGINAL (pre-equalization) gray with the old app's
  calibration (lead, 2026-08-03): `−80 + (47.4 + 80) · gray / 255 °C` (gray 0 → −80 °C,
  255 → 47.4 °C), through the Units module. Colorful channel hovers `—`. An invert-on-receive
  step (the old app has an `inverseImageData` sibling) was briefly added on the lead's "the image
  is received inverted" remark and then removed — he traced the inverted impression to the
  fixture's fake IR (a grayscale of *visible-light* imagery: bright desert AND bright clouds, no
  temperature meaning). Fixture temps are therefore nonsense by design; whether real wire IR needs
  inversion is an open question for real data — the old app's `inverseImageData` hints it might.
- **Image projection**: source images are equirectangular (rows linear in latitude) within their
  bounds; the look declares `_imageCoordinateSystem: COORDINATE_SYSTEM.LNGLAT` so deck reprojects
  onto mercator — this is what glues image coastlines to the basemap (before it, the image "sat
  wrong"). Hover row sampling is therefore **linear in latitude**, not MercatorBand. Open
  contract question for the backend lead: what projection will real images arrive in?

## Time semantics — v2 loop (landed 2026-08-06)

- **One moment, two views** (lead, 2026-08-06 — replaced the tangled currentTime/targetTime pair,
  "bad names… super weird and dependent"): **`TimeService.exactTime`** is the source of truth (a
  linkedSignal: raw `now` while live, the held pick otherwise; jumps write `snapJump(t)` into it)
  and **`displayTime`** derives as `snapJump(exactTime)` — a linear chain instead of two signals
  branching on live. Imagery hours asks (last 30 min before `exactTime`) and `keepIfRelevant` read
  exactTime, so ask and gate can never diverge (the old "satellites not working" bug is impossible
  by construction); model asks, polygons nearest-map, jumps, and the chip read displayTime. While
  live, exactTime ticks with the 60 s clock → the loop freshens every minute. A side effect of the
  chain: displayTime re-snaps automatically when the stops change (e.g. a forced-times layer
  activates while parked) — the old held pick could sit on a dead stop.
- **All frames in the window are fetched** (`Promise.all` over the hours) and loop at 2 fps with
  a 1.5 s newest-hold; frames params dedupe with an explicit-field `equal`
  (`choice` ref + `times.join()`), the window-computed precedent.
- Relevance = `frames[0] … last + 30 min`; back-only `timeWindow { 24, 0, 1h }` unchanged.

## Time semantics (static v1 — superseded, kept for the record)

- **As simple as possible**: the ask is anchored to **the displayed time** (`on.time()`), never
  the real clock. Hours are requested for the 30 minutes before it,
  `findNearestTime(hours, time, 0.5)` picks the closest available time (the polygons idiom — it
  was placed in `utils/time.ts` for exactly this reuse), and **one image** is fetched at that
  time. Back-only `timeWindow = { backHours: 24, forwardHours: 0, stepHours: 1 }`.
- **Relevance**: `picture.time … picture.time + 30 min`; `keepIfRelevant` compares plain
  `currentTime` — the live-aware variant was reverted with the simplification (it was only needed
  while asks ran ahead of the display time).
- **`Inputs` is THE layer seam** (lead, 2026-08-02: "since when are we injecting timeservice
  directly on fetch?? is it not the only reason for Inputs??"): a layer must never
  `injector.get(TimeService)` — the injector door is for infra like `HttpClient`. Whatever
  platform state a layer needs arrives through `Inputs`; if something is missing there, raise it,
  never reach around.
- Live freshness under this model = the cursor's hourly flips re-ask; the 60 s clock does not
  reach the satellite. A "live asks up to actual now, re-polls per minute" variant was built and
  **rejected for the static version** — its record lives in the retry section below.
- **Refetch dedupe without custom equality**: resources reload on params *identity*, so a fresh
  `{choice, time}` object per evaluation would re-decode the same image on every hours refresh. A
  JSON-stringify-`equal` computed was tried and replaced (lead: "not liking the params computed at
  all") by structure: `nearestTime` is its own computed returning a **primitive** (default signal
  equality dedupes it), and `choice` is reference-stable between real changes — so the params
  function's object only regenerates when an input truly changed.

## Fixture (dev/fixture-backend/synthetic-satellite.ts)

- **Real imagery from EUMETSAT's open WMS** (EUMETView, anonymous):
  `https://view.eumetsat.int/geoserver/wms` … `layers=mtg_fd:rgb_geocolour`, `srs=EPSG:4326`,
  `bbox=west,south,east,north` (version 1.1.1), `time=<ISO>`. MTG GeoColor at 10-min native
  cadence; `msg_fes:rgb_naturalenhncd` (MSG, 15-min) also works. Max probed size 3000² OK.
- **Source-selection saga** (every step lead-rejected until real): picsum photos → "super weird";
  one NASA GIBS MODIS image drifted horizontally → "goofy"; 5 MODIS days → real but day-jumps +
  **diagonal black inter-swath gaps** (MODIS's narrow swath); VIIRS (wide swath, seamless) → still
  one image per day; final: **5 EUMETSAT frames from the same hour** (yesterday 09:00 UTC + i·10
  min — noon local, always daylit) — "take pictures that are all from the same hour so it looks
  more real". One image serves both channels (IR = canvas `grayscale(1)`).
- Sectors: `near` = [30,27,40,36] 1024², 5-min cadence (was 10 — lowered so ≥5 frames fit a
  30-min window); `wide` = [20,18,52,44] 3000², 15-min. Frame time → source index =
  `floor(time/step) % 5` (consecutive frames = consecutive sources; the mod wrap can land
  mid-loop — accepted).
- **`latest` is computed per request from the real clock** — it was originally frozen at module
  load, which froze the fixture's newest frame at page-load time (the stuck "10:30–10:40 while
  it's 11:01" bug).
- **Real-IR attempt, rejected 2026-08-03** ("not liking these images"): the lead asked for a real
  IR10.8 source; EUMETView's `msg_fes:ir108` and `mtg_fd:ir105_hrfi` (all styles) serve near-raw,
  almost-black jpegs over a cloudless summer Levant — client-side equalize stretches them into
  posterized mush. Fixture IR stays grayscale(GeoColor), which "looked way better". With it, an
  invert-on-receive was added and removed twice — the fixture's fake IR has no temperature
  meaning, so fixture hover temps are nonsense by design. Whether real wire IR arrives inverted
  (the lead thinks yes; the old app's `inverseImageData` sibling supports it) is decided when real
  data arrives — `invert` was a 10-line util in `utils/image.ts` (255−v per channel, alpha kept),
  applied as `original = invert(received)` for IR only, display always equalizing the wire form.
- Routes in fixture-backend.ts: `/api/satellite/configuration` (`sat-a`, ir, near),
  `/api/satellite/bounds` (both sats × both sectors), `/api/satellite/hours`,
  `/api/satellite/image` (blob). Fixture liberty (flagged): sectors map to fixed bounds per
  satellite rather than rotating sat-b into the configuration.

## Current code state — loop v2 (2026-08-06, the retry landed)

The lead-approved retry design (fresh proposal, three options offered — he chose
**service-side pick**): the playhead never enters layer/look/Inputs code.

- **`LoopPlayer`** (`services/`): loop-only handler — 500 ms discrete `setInterval` tick over the
  **merged** times of all active loop layers, 3-tick newest-hold, publishes `playingTime`
  (`null` when no loops). The chip's single `זמן תמונה · HH:mm` line reads it (spec'd placement:
  second smaller line inside the handle chip, wrapper `bottom-full mb-3` growing upward).
- **`LoopLayer<D>`** (`layers/base/`): the kind marker — `abstract loopTimesOf(data): number[]` +
  `abstract atTime(data, playingTime): D`. `LayersService` wires everything by `instanceof`:
  `syncLoops` effect pushes merged times into the player (gated on active + look-shown + data
  present), and `showLayer` wraps the gated data signal with `playLoop` →
  `computed(() => layer.atTime(data(), playingTime()))` — symmetric with `keepIfRelevant`.
- **Per-layer draw effects** (the isolation landmine, now structural): the global draw effect
  became one `effect(() => drawLayer(...))` per activation, created in the `layerInjector` and
  dying with it — playhead flips redraw only loop layers; wind/contours untouched at 2 Hz.
- **Satellite**: `SatelliteLoop = { frames, shown, bounds }` — `fetch` publishes the
  loop with `shown` = newest; `atTime` re-picks `shown` (nearest ≤ playhead); the provider maps
  `loop.shown` → the generic `Image` look, which stayed byte-identical from static v1. Hover reads
  `loop.shown` — the "hover samples newest not loop-current" flag is dead.
- Radar's path: extend `LoopLayer`, implement `loopTimesOf` + `atTime`, done — sync is automatic.

> Standing lead verdict from static v1 ("not entirely happy with satellite-layer but can't find
> actual stuff to point out") — the fetch pipeline shape carried into v2; rethink when radar
> touches it.

`SatelliteLayer extends Layer<SatellitePicture>` in `layers/satellite/`
(`SatellitePicture = { time, display, original, bounds, channel }` — one flat type); fetch
pipeline: configuration → choice (אוטו resolution) → hours for the 30 min before `on.time()` →
`findNearestTime` → one picture resource (blob → ImageBitmap → OffscreenCanvas → original
ImageData + equalized display bitmap).
The `Image` look (`engine/looks/image.ts` — generic, nothing satellite-specific; named by its
LookKind like Colormap/Contours/Polygons) is a pure `BitmapLayer` of `ImageInput = { image,
bounds }`. No animation machinery
exists anywhere: no loop deck layer, no playhead service, no loop base class, no chip image-time
line. `AnimatedLayer` (wind's rAF base) is untouched by this feature.

## The animation retry — history (v1–v4 rejected; v5 above is the landed design)

The lead wants satellite imagery **animated as a loop from day one** (~2 fps, hold the newest
frame ~3× longer, always animating). It was built four ways and stripped; the retry starts fresh
from this record.

**Asks that stand (re-implement in the retry):**
1. Loop the fetched frames, oldest→newest, ~2 fps (`FRAME_SECONDS 0.5`, `NEWEST_HOLD 1.5s`).
2. **Show the time of the actual picture shown** — lead chose: **inside the handle chip** (over a
   badge above the strip / a layer-card row), as a second smaller line, text **`זמן תמונה · HH:mm`**
   — label + **hour only, no day/date** (a bare hour and a name-prefixed variant were both
   corrected). Implementation notes that stand: the chip wrapper must be bottom-anchored
   (`bottom-full mb-3`, not `-top-11`) so two lines grow upward, button `h-auto min-h-8 flex-col
   gap-0 py-1`; a `formatLocalHour` helper existed in `utils/time.ts` (removed with the strip).
3. **One animation handler for imagery loops**: it alone decides the times shown and the current
   image text. When satellite AND radar are both active, they lock to **one shared playhead** over
   the **merged** frame-time list (each layer shows its nearest frame ≤ playhead); ONE chip line.
4. **Loops are a different animation kind from the wind particles** — separate machinery,
   separate names; wind's `AnimatedLayer` rAF is fine as-is and must not be unified or touched.

**Design iterations and why each fell:**
- v1 — self-contained `SatelliteLoopLayer extends AnimatedLayer` (own rAF, `loopSeconds` state) +
  `playingTime` signal on **Look** written from `renderLayers`. Lead: "why do looks care for
  playingtime??" — playback state doesn't belong on a render definition.
- v2 — `playingTime` moved to **Layer** (beside `forcedTimes`), look receives the writable signal
  via constructor. Lead then issued the one-handler directive.
- v3 — engine `Animator` service: ONE rAF ticking **everything** (wind steppers + loop playhead
  over merged times), `Layer.loopTimesOf(data)`, `Inputs.playingTime()`. Lead: over-generalized —
  "the generifying of animator I meant in relation to satellites, not wind particles"; Layer
  carried broad members irrelevant to most layers; Inputs was "spammed".
- v4 — `LoopPlayer` service (500 ms `setInterval`, discrete tick — a 2 fps playhead needs no rAF
  or delta math) + thin `LoopLayer` base (`abstract loopTimesOf`) + services via `injector.get`.
  Lead: "not a fan of this current system at all" → strip everything, static, retry.

**Live-freshness variant (built, rejected for static — may return only if the lead asks):**
while live, the ask ran to `end = actual now` (never the snapped display time, which can round
DOWN and lag by up to 30 min — lead then: "live should be actual live always"), re-polling on each
60 s `now` tick so new frames slid in; scrubbed asks used the selected time. It required
`keepIfRelevant` to judge against real now while live (else the snapped-down cursor precedes the
earliest live frame and silently hides the layer — the "satellites not working" bug) and
JSON-equal guards on the hours ask (the 60 s tick otherwise minted identical-but-new requests →
invisible refetch churn). All of it was stripped when the lead chose closest-to-displayed-time:
"the keepifrelevant change is only relevant if the time sent is the current time, and I don't want
that for this".

**Technical landmines discovered (the retry must handle):**
- The single `draw` effect in LayersService redraws **all** looks on any dependency change. If the
  playhead flows through a provider/signal into that effect, every 2 Hz tick redraws every look —
  wind's deck layer sees changed props → `rebuild()` → **particles visibly reset twice a second**,
  and polygon label layout re-runs. The v3/v4 fix was one draw effect per layer activation
  (created in the `layerInjector`, dying with it) — that isolation (or an equivalent) is required.
- Redrawing the loop look on a prop change restarts an AnimatedLayer-style loop from its oldest
  frame (any props change → `rebuild()`); an opacity drag restarted the v1 loop.
- deck's `CollisionFilterExtension` is silently broken under our interleaved two-`beforeId`-group
  setup (it filtered ALL contour labels) — removed from contours 2026-08-02; do not reintroduce.
- Deck lineage: `initializeState` runs on a lineage's first instance, `finalizeState` on its last
  — anything registered in module state from a deck layer must be stored in the (shared) `state`
  object to unregister correctly.
- A 2 Hz loop redraw is signal-driven at ~2 fps — cheap; the frame flip itself needs no 60 fps
  machinery anywhere.

**Related plan rows**: "Imagery loops" (owns the time-bar **play button** — appears only while an
imagery layer is shown, lead 2026-07-26) and "Radar layer" (same raster machinery; every
availability answer also lists which radars exist; all displayed at once by near rounding time).
