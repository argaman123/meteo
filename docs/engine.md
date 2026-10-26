# Engine — `src/app/engine/`

The only code that imports maplibre. Layers describe data; looks in here turn it into overlays
(our own small vocabulary), and the bridge in `engine/maplibre/` draws overlays with MapLibre's own
sources and layers. Read before adding or changing a look.

## MapService (`engine/map-service.ts`)

- Owns the maplibre map; it IS the library boundary. One service, signals + methods together.
- Signals: `bbox`/`zoom` (live), `settledBbox`/`settledZoom` (on moveend — layers fetch by these),
  `cursor` (`null` off-map), `basemap`. Events: `clicks`, `rightClicks`, `markerDrags` — plain
  public `Subject`s.
- One service instance per map: a page with several maps provides `MapService` + `OverlayService`
  (and LayersService, TimeService, PlayerService) on each map's component. pmtiles and the vendored
  RTL text plugin register once at module load (maplibre throws on a second RTL registration;
  removing the protocol would kill the other maps' tiles).
- `init(container, fixedBounds = null)` awaits `document.fonts.ready` (canvas
  sprites must never bake a fallback font). Map: flat (mercator) or globe, no rotation/pitch,
  keyboard off, MSAA `antialias: true` (a GPU-cost flag for weak PCs). `fixedBounds` = a non-interactive, always-flat map that refits those bounds plus a 30 px
  margin (edge label chips stay whole) on every resize (`fixView` changes them). Every map keeps its drawing buffer (`preserveDrawingBuffer`) so its
  canvas can be read for screenshots — a small per-frame cost on animated pages, accepted.
- Projection (the מפה setting): `setProjection` switches live; `loadBasemapStyle` writes it into
  every style, so a basemap change keeps it.
- Low quality (the איכות setting, read at map creation): antialias off and `fadeDuration` 0.
  maplibre re-renders every frame for ~0.3 s after any repaint while label fades are on, so an
  animation capped below the screen rate only caps the map with the fade off.
- `showMarker`/`hideMarker` exist for the `MapPin` directive only. A shown marker only
  `setLngLat`s (re-`addTo` removes it first and kills a drag in progress).
- `basemapBright` is a module-level signal (looks are `new`ed outside DI, so they can't inject),
  written by `setBasemap` from each basemap's `bright` flag. Beside it, the map's drawing style:
  `inkColor()` (white on the dark basemap, `#212429` on light/colorful), `OUTLINE_COLOR`
  (`#0f172a` — the dark outline under lines, text and icons) and `MAP_FONT` (canvas text).
- `loadBasemapStyle` absolutizes the styles' root-relative sprite/glyph/pmtiles/geojson URLs.

## OverlayService (`engine/overlay-service.ts`) and the bridge (`engine/maplibre/`)

- `draw(look, data)` = `look.buildLook(look.provider.provide(data))`; each overlay class creates its
  own renderer (`createRenderer`, one file each in `engine/maplibre/`, lead-marked unverified),
  kept while the overlay at that index stays the same class and updated in place (`setData`, canvas
  re-upload, `setPaintProperty`). `remove(look)` destroys its renderers and calls `look.release()`.
- One GeoJSON source per look (`maplibre/feature-source.ts`): line, area and icon renderers stage
  their features as parts (each layer filters on its `part`), then one `setData` commits the whole
  look — a polygon map's fills, outlines and chips switch in the same frame.
- Draw order = `LookKind` rank: Image < Colormap < Radar < Borders < Contours < Particles < Polygons
  < Icons < Lines < Points. Looks ranked below Borders move before the basemap's `coastline` layer,
  so the black border block draws above the colors; the rest go on top. Re-ordered after every draw.
- A basemap switch reloads the style (`setStyle(…, { diff: false })`) and wipes our sources,
  layers and images; `style.load` re-adds every renderer. MapLibre also reloads its style after a
  lost WebGL context, so the same path rebuilds the map after a GPU reset.
- Overlay kinds (`engine/base/overlay.ts`), small classes a look builds with `new LineOverlay(…)`:
  - **ImageOverlay** — an `ImageData`/bitmap/canvas over bounds → a `canvas` source (`animate: false`,
    one-frame `play`/`pause` to re-upload) + a `raster` layer. Rows must already be mercator-spaced.
    `raster-opacity` = `1 − (1 − opacity)^1.75`: deck drew a 60 % colormap at ~80 % coverage and
    the lead tuned the looks by that; the curve keeps them looking the same.
  - **LineOverlay** — paths with per-line `Rgba` + px width → GeoJSON (`tolerance: 0`) + `line` layer;
    `dashed` = `line-dasharray [4, 3]` (in line widths).
  - **AreaOverlay** — polygons with `Rgba` → GeoJSON + `fill` layer.
  - **IconOverlay** — position + `Sprite` (`{ key, create(): canvas }`) + size + clockwise angle +
    opacity. Sprites go to MapLibre's image atlas (`addImage`, keyed per renderer), drawn by a
    `symbol` layer with overlap allowed and placement ignored (every icon always shows), source
    z-order. `IconScaling.Pixels`: `size` = css height; `IconScaling.World`: `size` = height at
    zoom 0 doubling per zoom (barbs, arrows), the curve stopping before MapLibre's 255 size cap.
  - **AnimationOverlay** — a `paint(context, frame)` callback on a 2D canvas over bounds (screen footprint
    × dpr, ≤ 2048), cleared and repainted on its own rAF, shown through an animated `canvas` source.
    Low quality skips ticks under 30 ms.
  - **TrailOverlay** — wind-particle trails: a custom WebGL2 layer (plain GL calls) that accumulates
    segments from `advance(dt)` into ping-pong framebuffers in `prerender`, then draws the texture
    on a 16×16 mercator mesh through MapLibre's `projectTile` (flat and globe).

## The look contract (`engine/base/look.ts`)

- `Look<I>`: `kind`, `provider`, a pure `buildLook(input: I): Overlay[]`, `controls`,
  `legend: Signal<Legend | null>`, `release()`. Signals read in `buildLook` (opacity, ink)
  redraw the look when they change.
- Looks are registry-lifetime singletons: any render cache on a look clears in `release()` —
  nothing holds data while hidden.
- `Provider<I>` (`objects/provider.ts`) adapts a layer's data to a look's input:
  `new Provider((grids: Grid[]) => grids[0])`. Always annotate the lambda parameter — an
  unannotated one infers `never` and silently skips type checks. The data ⇄ look match is a
  runtime contract by choice.
- Looks stay source-blind and context-free: everything a look needs rides its provider-built input
  (polygon zoom included). Dynamic per-instance state on a look is a Signal field, never a getter.
- Legends: `Legend = GradientLegend | SwatchesLegend` (`LegendType`), stops authored ascending
  (the UI renders severest on top); `gradientLegend(stops, quantity, unit)`.
- Authored colors are hex through `rgba(hex, alpha)` (`utils/color-scale.ts`), typed `Rgba`.
- Sprites are created once per key by the bridge; a look never caches its own sprites.
- Heavy work per new data runs off the main thread (`engine/base/background.ts` +
  `background.worker.ts`, lead-marked unverified): colormap and radar images
  (`buildImageInBackground`, data-only params — palette, style, threshold, abs, blur) and contour
  tracing (`traceContoursInBackground`). A look holds a `BackgroundResult` per cache and calls
  `requestResult(input)` in `buildLook`: it returns the last finished `{ input, output }` pair and
  starts work for a new input; draw from the pair (its input's bounds), never from the current
  input. Starting work from inside the draw effect is a deliberate side effect, not a resource. A
  result for an input that is no longer wanted is dropped. Keys are input identity, so
  `Provider` memoizes its output per data (a `computed`, re-run when a signal it reads changes).
  Radar keeps one result per radar index, so a playing loop shows the previous frame until the
  next is ready (no flicker). Polygon rims were measured cheap and stay on the main thread.
- Similar mechanics share a base class (`GridIcons`, `PointIcons`) — extract it in the same change
  when a new look would duplicate an existing one.

## Performance rules

- The 4×-throttled stop-of-pan stall is ~20 ms (basemap level) with colors + contours + radar on —
  keep it there: new per-data work goes through the background thread.
- `colorScale` (`utils/color-scale.ts`) precomputes smooth palettes into a 2048-color table and
  caches stepped palettes' parsed colors — per-pixel d3 string parsing froze the page ~1 s per
  pan stop on an i5-class CPU.
- `meteoBenchmark()` in the DevTools console (perf HUD, dev only) pans through fixed setups —
  basemap only, colors, weather, polygons, no frost, 75 %/50 % map resolution — and prints fps
  per setup plus the WebGL renderer and canvas size.

## Looks catalog (`engine/looks/`)

- **Colormap** (`Look<Grid>`) — palette `{ stops, style: smooth | stepped }` → `buildImage(grid,
  colorScale, interpolation, filterValue, blur)` (mercator-banded rows, 1024 px, optional value
  filter, optional 2 px canvas blur), memoized per grid. Opacity `percent` control (default 0.6).
  Legend derived from the palette + a label fn (computed, so unit switches apply).
- **Radar** (`Look<Grid[]>`, kind Radar — above colormaps, not exclusive) — one ImageOverlay per
  grid via `buildImage` nearest + blur, per-grid image memo; `minimumValue` floor; עיגול toggle
  draws each radar's coverage ring (degree-space circle — slightly tall on mercator, that's the
  projection); optional רעש toggle draws negatives as |value|; swatches legend from the palette's
  labels. Overlap: maps stack in list order, hover reports the max.
- **Image** — equirectangular sources (satellite) resampled row by row into mercator rows, once per
  image; opacity control.
- **Contours** (`Look<Grid>`) — `contourLines` (`utils/contours.ts`: NaN-aware 3×3 blur ×2 →
  `@turf/isolines` on the index grid → split at NaN gaps → Chaikin ×3); 3.5 px dark outline under a
  1.5 px colored core; label sprites = bold 12 px numbers in the line color mixed 50% to white
  with a 4 px dark outline, always with a unit. Placement: a candidate every 5% of view width, taken
  if ≥ half a view width past this line's last label and ≥ 5% from every label, otherwise the line
  stays unlabeled. Each contour set has a fixed identity color (shown as a swatch control).
- **WindParticles** — see below. Speed ×0.5/×1/×2 cycle control.
- **WaveCrests** (AnimationOverlay) — 40×30 slots over the view, each crest respawning inside its
  own cell; one arc canvas drawn in the ink; a crest never turns (bearing and velocity fixed
  at birth), size 7 → 16 px by height (4 m+), alpha ≤ 160 with a 2–4 s sine fade; crests born on
  land stay invisible for their life.
- **GridIcons** base (kind Icons) — icons on data cells every `width / 35` cells, size capped to a
  35-across slot (screen-constant spacing), sprite per key × ink cached. Subclasses: **WindBarbs**
  (knots in 5-kt steps, calm = dot, flipped south of the equator) and **Arrows** (length by
  magnitude in eighths up to `longestAt`).
- **PointIcons** base — one IconOverlay, sprite per point; subclass **Labels** (16 px weight-500 text with a
  dark outline; obs values, SLP centers, measure legs). `labels.ts` also exports
  `createLabel`, which Contours uses for its numbers. Labels' scaling contract: keep the set of
  unique strings bounded (the obs fixture quantizes cloud base for this).
- **SvgIcons** (kind Points) — `public/icons/<name>.svg` + `<name>-outline.svg`, loaded once;
  one sprite per color: the outline tinted dark under the fill tinted the point's color. A new map symbol = two
  SVG files + `new SvgIcons(provider, name, size, legend)`. Canvas stays only for text and
  generated glyphs (barbs, arrows).
- **Polygons** — fills, geometric hatching (lines, 0.12° spacing), sector
  frame, outlines (thin ink outline unless the style sets one), inner rim band (−2 km Turf buffer
  in the fill color, above everything), text chips (canvas pill in the fill color, luminance-picked
  text). Chips home on the center of mass (polylabel when outside a concave ring) and relax only
  text-vs-text overlaps per settled zoom; a chip that leaves its polygon snaps back home. The
  geometry (`createLinePattern`, `createInnerBorders`, `calcLabelPosition`, `spreadLabels`) is
  private methods of the look — it serves only this look.
- **Path** (kind Lines) — dark outline + white core + a dashed live leg.

## Animated looks

- AnimationOverlay and TrailOverlay own their frame loop in the bridge; the look supplies a callback
  (`paint` / `advance`) that closes over its simulation, cached per data identity on the look.
- Every per-frame effect (fade, step) scales by `dt`: a look is identical at 30, 60 or 120 fps.
- HMR leaves orphan rAF loops (refresh); production teardown is correct.

## Wind particles (`engine/looks/wind-particles.ts`)

`WindParticles` look (a TrailOverlay, one `ParticleSim` per field) → `ParticleSim` (CPU). The GPU
half — shaders and framebuffers — is `engine/maplibre/trails-renderer.ts` (lead-marked unverified).

- `ParticleSim`: 2000 particles, prime-stride even spawning over a 40-column cell grid, lifetimes
  1.5–3.5 s; a dying particle writes a degenerate segment (no teleport streak); emits lon/lat
  segments. Step length = `min(13, 3.5·speed^0.3)` × 0.004·lonSpan per second (compressed speed
  range: calm visible, jets not huge).
- `TrailsLayer`: ping-pong framebuffers; per frame a fade pass then the newest segments as
  instanced quads (perpendicular-expanded, smoothstep edges); its texture is drawn on the map mesh.
  Trails survive a time step with the same bounds; new bounds, ink or width rebuild.
  Texture = the bounds' screen footprint × dpr (half that on low quality, line width scaled to
  match), clamped 256–4096.
- Tuning knobs at the top of the file (the one lead-approved knob block): `COUNT` 2000, `DECAY`
  0.94 per 1/120 s (the lead's 120 Hz screen; the fade uniform is `DECAY^(dt·120)`, so trail length
  is the same at any frame rate), `LINE_WIDTH` 2.5 css px (× dpr in the shader).
- Shader rules: the fade decays alpha only with rgb pinned to the ink (multiplying rgba grays old
  trails); decay is floored at 8-bit (`floor(a·decay·255)/255`) or low alphas round back up and
  leave permanent residue on the map.
- Ink is baked into the shaders; a basemap flip rebuilds.
- The offscreen passes run in the custom layer's `prerender` and restore the GL state they touch.

## Basemaps & borders

- Self-hosted Protomaps PMTiles + three style JSONs (`public/basemaps/styles/{dark,light,colorful}.json`);
  picker thumbnails in `public/basemaps/thumbnails/` (re-capture with Playwright when a style
  changes).
- Country borders, `coastline` and `israel_outline` draw above weather in bold black (width 2),
  from a `maxzoom: 5` clone of the protomaps source (one frozen geometry at every zoom).
  `boundaries_country` filters `disputed: true`; disputed borders are hidden inside an Israel
  `within` box (lon 33.8–36.9, lat 29.2–35.0).
- `public/basemaps/israel.geojson` supplies the political envelope: Gaza–Israel, Israel–Lebanon,
  trimmed Lebanon–Syria (z7 extractions), and a Golan + control-zone arc pixel-traced from
  `docs/israel-control-zone-reference.png`. Segments the z5 tiles draw normally are not vendored
  (doubles braid). Districts and labels stay below weather.
- Known: black borders are near-invisible on the dark basemap without a colormap.

## Rejected (don't re-offer)

- WeatherLayers GL — replaced by first-party looks.
- Canvas2D wind trails — 30 fps on hi-res screens. A core + outline trail.
- deck.gl / luma.gl — their icon atlas crashed an older NVIDIA driver (the site PC), and only
  their newest line gets fixes while luma keeps rewriting itself; replaced by MapLibre's own
  layers. Its `TextLayer` (sdf) outlines also looked wrong.
- Hand-plotted or icon-library-parsed map symbols — SVG files.
- Engine context for looks (a LookView, a zoom param) — the provider input carries everything.
- Flattest-stretch contour label scoring; d3-contour (closed polygons with border frames).
- A `RasterStyle` params bag, `rasterize`, `imageOf` — `buildImage` with positional args.
- Linked polygon ↔ chip hover highlight — looked good, too much boilerplate. Revival design: an
  optional `Look.hover(info): boolean`, the OverlayService forwards the map's feature hover and rebuilds that look
  from cached provider output (fill +45 brighter, chip swaps to a brightened sprite).
- Smoothed or scalloped polygon edges — never modify the drawn shape. "Top fill wins" in overlaps —
  forecasters read blended stacks.
- A crosshair cursor while coordinates are on.
