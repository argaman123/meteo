# Engine — `src/app/engine/`

The only code that imports maplibre, deck.gl and luma.gl. Layers describe data; looks in here
turn it into deck layers. Read before adding or changing a look.

## MapService (`engine/map-service.ts`)

- Owns the maplibre map; it IS the library boundary. One service, signals + methods together.
- Signals: `bbox`/`zoom` (live), `settledBbox`/`settledZoom` (on moveend — layers fetch by these),
  `cursor` (`null` off-map), `basemap`. Events: `clicks`, `rightClicks`, `markerDrags` — plain
  public `Subject`s.
- `init(container)` awaits `document.fonts.ready` (canvas sprites must never bake a fallback font),
  registers pmtiles + the vendored RTL text plugin. Map: mercator only, no rotation/pitch, keyboard
  off, MSAA `antialias: true` (deck draws into maplibre's context — a GPU-cost flag for weak PCs).
- `showMarker`/`hideMarker` exist for the `MapPin` directive only. A shown marker only
  `setLngLat`s (re-`addTo` removes it first and kills a drag in progress).
- `basemapBright` is a module-level signal (looks are `new`ed outside DI, so they can't inject),
  written by `setBasemap` from each basemap's `bright` flag. Beside it, the map's drawing style:
  `inkColor()` (white on the dark basemap, `#212429` on light/colorful), `OUTLINE_COLOR`
  (`#0f172a` — the dark outline under lines, text and icons) and `MAP_FONT` (canvas text).
- `loadBasemapStyle` absolutizes the styles' root-relative sprite/glyph/pmtiles/geojson URLs.

## OverlayService (`engine/overlay-service.ts`)

- deck `MapboxOverlay`, interleaved. `draw(look, data)` = `look.deckLayer(id, look.provider.provide(data))`;
  `remove(look)` calls `look.release()`.
- Draw order = `LookKind` rank: Image < Colormap < Radar < Borders < Contours < Particles < Polygons
  < Icons < Lines < Points. Looks ranked below Borders are cloned with `beforeId: 'coastline'`, so
  the basemap's black border block draws above the colors (deck 9 layer groups).

## The look contract (`engine/base/look.ts`)

- `Look<I>`: `kind`, `provider`, a pure `deckLayer(id, input: I)` returning one or more deck
  layers, `controls`, `legend: Signal<Legend | null>`, `release()`.
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
- Authored colors are hex through `rgba(hex, alpha)` (`utils/color-scale.ts`), typed `Rgba`;
  deck's own `Color` type never leaves the engine.
- `engine/base/sprite-cache.ts` — `SpriteCache` draws each distinct canvas once per key →
  `LabelIcon`, cleared in `release()`.
- Similar mechanics share a base class (`GridIcons`, `PointIcons`) — extract it in the same change
  when a new look would duplicate an existing one.

## Looks catalog (`engine/looks/`)

- **Colormap** (`Look<Grid>`) — palette `{ stops, style: smooth | stepped }` → `buildImage(grid,
  colorScale, interpolation, filterValue, blur)` (mercator-banded rows, 1024 px, optional value
  filter, optional 2 px canvas blur), memoized per grid. Opacity `percent` control (default 0.6).
  Legend derived from the palette + a label fn (computed, so unit switches apply).
- **Radar** (`Look<Grid[]>`, kind Radar — above colormaps, not exclusive) — one BitmapLayer per
  grid via `buildImage` nearest + blur, per-grid image memo; `minimumValue` floor; עיגול toggle
  draws each radar's coverage ring (degree-space circle — slightly tall on mercator, that's the
  projection); optional רעש toggle draws negatives as |value|; swatches legend from the palette's
  labels. Overlap: maps stack in list order, hover reports the max.
- **Image** — BitmapLayer with LNGLAT image coordinates (equirectangular sources); opacity control.
- **Contours** (`Look<Grid>`) — `contourLines` (`utils/contours.ts`: NaN-aware 3×3 blur ×2 →
  `@turf/isolines` on the index grid → split at NaN gaps → Chaikin ×3); 3.5 px dark outline under a
  1.5 px colored core; label sprites = bold 12 px numbers in the line color mixed 50% to white
  with a 4 px dark outline, always with a unit. Placement: a candidate every 5% of view width, taken
  if ≥ half a view width past this line's last label and ≥ 5% from every label, otherwise the line
  stays unlabeled. Each contour set has a fixed identity color (shown as a swatch control).
- **WindParticles** — see below. Speed ×0.5/×1/×2 cycle control.
- **WaveCrests** (`AnimatedLayer`) — 40×30 slots over the view, each crest respawning inside its
  own cell; one arc sprite mask-tinted with the ink; a crest never turns (bearing and velocity fixed
  at birth), size 7 → 16 px by height (4 m+), alpha ≤ 160 with a 2–4 s sine fade; crests born on
  land stay invisible for their life.
- **GridIcons** base (kind Icons) — icons on data cells every `width / 35` cells, size capped to a
  35-across slot (screen-constant spacing), sprite per key × ink cached. Subclasses: **WindBarbs**
  (knots in 5-kt steps, calm = dot, flipped south of the equator) and **Arrows** (length by
  magnitude in eighths up to `longestAt`).
- **PointIcons** base — IconLayer + sprite cache; subclass **Labels** (16 px weight-500 text with a
  dark outline; obs values, SLP centers, measure legs). `labels.ts` also exports
  `createLabel`, which Contours uses for its numbers. Labels' scaling contract: keep the set of
  unique strings bounded (the obs fixture quantizes cloud base for this).
- **SvgIcons** (kind Points) — `public/icons/<name>.svg` + `<name>-outline.svg`, deck mask tint;
  outline and fill interleaved per point so dense clusters keep their rims. A new map symbol = two
  SVG files + `new SvgIcons(provider, name, size, legend)`. Canvas stays only for text and
  generated glyphs (barbs, arrows).
- **Polygons** — fills (SolidPolygonLayer), geometric hatching (PathLayer, 0.12° spacing), sector
  frame, outlines (thin ink outline unless the style sets one), inner rim band (−2 km Turf buffer
  in the fill color, above everything), text chips (canvas pill in the fill color, luminance-picked
  text). Chips home on the center of mass (polylabel when outside a concave ring) and relax only
  text-vs-text overlaps per settled zoom; a chip that leaves its polygon snaps back home. The
  geometry (`createLinePattern`, `createInnerBorders`, `calcLabelPosition`, `spreadLabels`) is
  private methods of the look — it serves only this look.
- **Path** (kind Lines) — dark outline + white core + a dashed live leg (`PathStyleExtension`).

## Animated looks (`engine/base/animated-layer.ts`)

- `AnimatedLayer` = a deck CompositeLayer with its own rAF loop: `step(dt)` then
  `setState({ tick })`; `rebuild()` on props change; `finalizeState` cancels the loop.
- deck creates a new layer instance on every props change and hands `state` over, but the rAF
  closure stays bound to the FIRST instance → `step()` may read only `state` (and props that never
  change). Store data in state inside `rebuild()`.
- On identity-stable data, every accessor that changes per frame needs `updateTriggers`.
- HMR leaves orphan rAF loops (refresh); production teardown is correct.

## Wind particles (`engine/looks/wind-particles.ts`)

Order in the file, most important first: `WindParticles` look → `WindParticleLayer`
(AnimatedLayer) → `ParticleSim` (CPU) → shaders + `TrailRenderer` (GPU, lead-marked unverified).

- `ParticleSim`: 2000 particles, prime-stride even spawning over a 40-column cell grid, lifetimes
  1.5–3.5 s; a dying particle writes a degenerate segment (no teleport streak); emits lon/lat
  segments. Step length = `min(13, 3.5·speed^0.3)` × 0.004·lonSpan per second (compressed speed
  range: calm visible, jets not huge).
- `TrailRenderer`: ping-pong framebuffers; per frame a fade pass then the newest segments as
  instanced quads (perpendicular-expanded, smoothstep edges); its texture feeds a BitmapLayer.
  Texture = the bounds' screen footprint × dpr, clamped 256–4096.
- Tuning knobs at the top of the file (the one lead-approved knob block): `COUNT` 2000, `DECAY`
  0.94, `LINE_WIDTH` 2.5 css px (× dpr in the shader).
- Shader rules: the fade decays alpha only with rgb pinned to the ink (multiplying rgba grays old
  trails); decay is floored at 8-bit (`floor(a·DECAY·255)/255`) or low alphas round back up and
  leave permanent residue on the map.
- Ink is baked into the shaders; a basemap flip rebuilds (old GPU resources destroyed a frame
  later).
- GPU passes run from the rAF tick on deck's device. If other layers glitch while wind animates,
  move the passes into deck's draw cycle.

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

- Globe/3D now — deck's interleaved overlay renders our looks broken on maplibre's globe (deck
  9.3–9.4α). Retest on new deck majors; fallback: colormap/particle canvases as maplibre raster
  sources.
- WeatherLayers GL — replaced by first-party looks.
- Canvas2D wind trails — 30 fps on hi-res screens. A core + outline trail.
- deck `TextLayer` (sdf) labels — their outlines looked wrong.
- `CollisionFilterExtension` — silently filters every label under the two beforeId groups.
- `FillStyleExtension` hatching — geometric hatching is cheaper and extension-free.
- Hand-plotted or icon-library-parsed map symbols — SVG files.
- Engine context for looks (a LookView, a zoom param) — the provider input carries everything.
- Flattest-stretch contour label scoring; d3-contour (closed polygons with border frames).
- A `RasterStyle` params bag, `rasterize`, `imageOf` — `buildImage` with positional args.
- Linked polygon ↔ chip hover highlight — looked good, too much boilerplate. Revival design: an
  optional `Look.hover(info): boolean`, the OverlayService forwards deck's `onHover` and rebuilds that look
  from cached provider output (fill +45 brighter, chip swaps to a brightened sprite).
- Smoothed or scalloped polygon edges — never modify the drawn shape. "Top fill wins" in overlaps —
  forecasters read blended stacks.
- A crosshair cursor while coordinates are on.
