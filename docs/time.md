# Time — `services/time-service.ts`, `services/player-service.ts`, `pages/home/time-bar/`

## TimeService

- `now` ticks every 60 s. `live` starts on; any jump drops it; clicking the time chip re-arms it.
- **`exactTime`** is the source of truth (a `linkedSignal`: raw `now` while live, the held pick
  otherwise). **`displayTime`** = `snapJump(exactTime)`.
- Who reads which: imagery asks and the relevance gate read `exactTime` (they can never diverge);
  model asks, polygons' nearest map, jumps and the chip read `displayTime`.
- `windows` (pushed by LayersService from active layers' `timeWindow`) → `window` = the max
  back/forward around `now` rounded to 5 min (default 24/96 with no layers). It carries a value
  `equal` — object-identity churn would silently re-trigger resource loads.
- Known rare boot bug (not seen since Angular 22.1.3): `syncTime` never runs its first time → a
  permanent 24/96 band. Fix if it returns: push `windows` from showLayer/hideLayer, keep an effect
  only for forced times.
- `timeStops`: the forced times when any layer publishes them (they override — never a union with
  grid stops), else the step grids of the active windows (default 3 h). `snapJump` = nearest stop;
  `jumpTo` / `jumpBy` / `stepForward` / `stepBack` / `jumpToNow`.
- Times are local only (no Zulu, no toggle). All times are ms; seconds exist only on the wire,
  converted at the request/parse edge with `msToSeconds` / `secondsToMs`; durations go through the
  `utils/time.ts` helpers (`hoursToMs`, `minutesToMs`…). Identifiers say `Ms`.

## PlayerService

- Plays loop layers only (satellite, radar, observations, birds, lightning). Model and polygon
  layers don't animate (opt-in animation is a plan row).
- `setTimes(...perLayer)` merges every active loop layer's times. Pace: the sparsest layer's
  smallest frame gap takes `frameMs` (400 ms) ÷ `speed` of wall time; `loopTime` sweeps at constant
  velocity and each layer nearest-picks from it, so each flips evenly at its own cadence. After the
  newest frame it holds 1.5 s of wall time, then restarts.
- Exposes `loopTime`, `nearestFrameTime` (the chip's `זמן תמונה · HH:mm`), `loopProgress`,
  `playing`, `speed` (×0.5/1/2/4, session-only), `play` / `pause` / `stepFrame(±1)` (pauses,
  wraps). A pause dies with the loop session: when no loop layer remains, `playing` resets.
- While live, loops refresh every minute (exactTime ticks); scrubbed, they play the `loopMinutes`
  before the selected time.
- Caveat: a multi-site layer merges its sites' times first, so phantom gaps can understate its
  cadence — harmless while a sparser layer is active; per-site lists if it ever paces wrong alone.
- The rAF loop runs only while loop layers are active.

## Time bar (`pages/home/time-bar/`)

- `TimeBarService` owns the zoomable view (display state — kept out of TimeService): `view`,
  `zoomView` (wheel around the cursor, span 3 h…20 years), `shiftView` (shift+wheel), `panView`,
  `positionInView` / `timeInView` — the one home for view math (time bar, meteogram frame,
  charts). An effect keeps displayTime in view. Boots centered on now (window span × 1.2).
- Ticks: `timelineTicks` (`utils/time.ts`) picks a row of `TICK_LEVELS` by span — a minor
  unit+step paired with the major unit above it, both walked from a `Date` cursor aligned to the
  major unit (≤ ~12 ticks). A month-minor view with no year boundary promotes its first month to a
  bold "חודש שנה" major. Minors within 5% of the span of a major are dropped. Labels: `12:00`,
  `ו 31.7` (`WEEKDAY_LETTERS`), `אוגוסט 2026` (major) / `אוקטובר` (minor), `2027`.
- Pointer: drag the track = pan; click without moving (4 px threshold) = jump; drag the handle
  (±10 px) = scrub with preview, commit on release. Scrubbing clamps to the data window even though
  the view zooms past it. Hovering shows a faint line at the snapped would-land stop.
- Paint: past band orange / future band sky (vertical fades below the label row), a glowing
  emerald now line, hairline stop markers at `timeStops`, the handle with its chip riding above
  (clamped 7–93%, hidden off-view; the chip IS the now button — filled while live, pulses while
  loading). The chip sits in a plain positioned div: spartan's `transition-all` on the button
  would animate the moving `left`.
- Step buttons beside the track: `‹3h ‹ › 3h›` and `‹24h 24h›`; ←/→ = map steps.
- The loop pill (`pages/home/loop-pill/`: skip back, play/pause, skip forward, ×N speed chip,
  progress line) floats centered above the bar while `loopTime` is non-null.
- The meteogram is projected into the bar's track column — see [point-views.md](point-views.md).

## Rejected (don't re-offer)

- d3-scale `ticks()` — its interval choice drifts between levels.
- A union of forced times and grid stops — forced times override.
- Equal wall time per merged stop — uneven pace per layer; the constant-velocity sweep replaced it.
  A snapped-then-re-nearest playhead — double quantization wobble.
- Zulu/UTC display or a toggle; a relative "בעוד 3 שעות" label; a separate עכשיו button; an
  "עכשיו" label on the now line; weekend tint.
- A slider time bar or a floating time card — the full-width zoomable strip.
- An in-strip loop block or a speed slider — the floating pill and a cycle chip. A media-row pill
  and a conic progress ring around play.
- Level persistence — the level resets each session.
