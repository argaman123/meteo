# Chrome — page layout, menu, legend, settings, visual language

Code: `src/app/pages/home/` and the vendored spartan copies in `src/spartan/`.

## Page (`pages/home/home-page.*`)

- The map is a rounded window inside solid chrome: top bar (`h-12`), menu panel at the start edge
  (`w-48`), time bar at the bottom, sounding drawer at the end when open.
- The maplibre container sits in an inset wrapper div (`overflow-hidden rounded-xl`): maplibre's
  CSS forces `position: relative` on its own container and unlayered CSS beats Tailwind's layered
  utilities, so sizing lives on the wrapper.
- `--time-bar-height` and `--sounding-table-width` are measured by ResizeObservers and inset the
  map well, legend and HUD. The menu is stacked after the time bar so a grown bar never paints over
  it.
- Root font size is 17 px — rem math, not 16.
- Each page owns its own top bar; `app.html` is the router outlet + the app-wide toaster.

## Daily forecast page (`pages/daily-forecast/`, `/daily-forecast`)

- תחזית יומית: a wall-screen and slide-screenshot page, reached by a `ShortcutLink` row in the
  menu; its own top bar, a `1fr auto 1fr` grid so the middle sits on the page's center: a ghost →
  חזרה למסך הראשי back link (no wordmark, no title) | one rounded bar: secondary ‹ › arrow buttons at its ends, the date + filled sun/moon on an amber (day) / indigo (night) tint between (large, no hours) + עכשיו |
  מקומי | אזורי + screenshot. Fixed-view polygon maps, one `ForecastMap` per forecast time, each with its own
  MapService/OverlayService/LayersService/TimeService/PlayerService and its own `PolygonsLayer`.
- The shown times = four times 3 h apart from a `startTime` of 08:00 or 20:00 local (DST-safe local-hour math). Each map
  holds its time unsnapped (`setExactTime`), so it shows the map page's nearest map only when that
  map's ±1.5 h covers the time — never a far map under a near header; the header always reads the
  map's own time (08:00, not the drawn map's hour). No map → the basemap + a quiet אין מפה.
- Live (the current start time, however reached): a map leaves when its ±1.5 h validity ends; when
  the last leaves the next 12 h start. Back stops at the live start time; forward stops at the polygons'
  96 h window. Maps reload every 60 s through `reloadLayer`.
- Layout: מקומי = one row (earliest at the start edge), the rest widen as maps leave. אזורי = 2×2;
  three left = two on top + one centered below at the same size; two or one grow to fill.
- Header strip above each map (big hour + small day); one shared swatch legend strip below.
  Hover works (each map mounts its own HoverReadout).
- Screenshot (ScreenshotService): headers + maps + legend.
  The sector choice is session-only (a reload returns to מקומי).

## Top bar (`pages/home/top-bar/`)

Wordmark (מטאו + tracked-caps METEO) at the start; at the end: basemap picker
(dropdown of full-bleed thumbnail rows), screenshot camera, settings gear, perf HUD toggle (ghost when off — the page
hands the HUD in as an input). Icon
buttons are `secondary` when inactive; tooltips use the vendored spartan tooltip (`position` per
placement).

## Menu (`pages/home/layer-bar/`)

- קיצורים first: icon rows (`Shortcut.icon`), `default` when pressed, else `secondary`.
- שכבות (collapsible, session-only): rows from `menuLayers`. Active = `default` + bold; inactive =
  the `soft` variant; loading = pulse; active with `null` data = `opacity-50`, no note.
- An active layer shows a chevron (collapse-all) and a bordered `bg-background/50` panel: the group
  toggle (LayerGroup), layer controls, then every look row (checked or not) with its controls.
  Unchecked look rows mute the label and dim their controls — never the checkbox. Inactive layers
  show no rows and no chevron. Disclosure is user-controlled, never auto-unfolded.
- Contour rows show their identity color swatch. Every control renders through `ControlView`
  (`layer-bar/control/`) — the one place a control's widget is drawn.
- Scroller: a `dir="ltr"` wrapper around `dir="rtl"` content puts the scrollbar on the screen edge;
  thumb on hover only; a bottom mask fade.

## Legend bar (`pages/home/legend-bar/`)

- One frosted accordion card at the bottom-end corner; a title row per active look that has a
  legend (titled by the layer name). The newest card opens automatically (`linkedSignal` over the
  list); title clicks switch; clicking the open one folds all. Collapsed titles show a palette
  sliver.
- Gradient: full-height strip + evenly spaced labels (Windy's model, not value-proportional).
  Severest on top for every legend; stops are authored ascending and rendered bottom-up. Swatch
  labels sit in `dir="auto"` spans (digit-only labels render reversed under RTL otherwise).

## Hover readout (`pages/home/hover-readout/`)

Cursor-following frosted chip, one line per active layer with data: name · `layer.hover(...)`
(`dir="auto"`, multi-line values allowed). Hidden off-map. Shared code: it never names a feature.

## Settings panel (`pages/home/settings-panel/`)

Gear popover (`align="end"`), Table controls in two sections. יחידות: רוח kt / m/s, גובה
גיאופוטנציאלי m / ft, קואורדינטות כבוי / DD / DMS (כבוי hides the coordinates layer). תצוגה:
איכות רגילה / נמוכה — low quality de-frosts the floating windows and, at map creation, turns
off antialiasing and label fades, runs animations at 30 fps and paints wind trails at half
resolution (docs/engine.md); a change reloads the page, clicking the selected choice doesn't. מפה
שטוחה / כדור switches the projection live (flat by default). A new
setting = one `options()` entry in `settings-controls.ts` (unit choices go into `unitControls`,
which the Units module reads). Other quantities are fixed by the lead (°C, km, mb…; bird heights
forced to m).

## Level bar (`pages/home/level-bar/`)

A narrow frosted column beside the menu (`start-51 top-15`): a kft/mb cycle toggle on top, a
clickable top label, the rail, and a clickable surface icon (`matTerrainRound`). Rail stops sit at
true barometric altitudes; drag snaps to the nearest stop by altitude, previews while dragging and
commits on release. The value chip rides the handle on the map side (`N רגל מעפ״י` via
`Quantity.Altitude`, or `300mb`), notation inside an inner `dir="auto"` span.

## Perf HUD (`dev/perf-hud/`)

Ships with the app (dev tooling — build without asking). On by default at the top of the map:
FPS + 60-sample sparkline, JS heap, and each timed layer's validity range (dimmed when `null`).
Ctrl+Alt+P or the top-bar button toggles it.

## Screenshots (`services/screenshot-service.ts`)

- `takeScreenshot(area, fileName, root = area)`: renders `root` (modern-screenshot; every map
  keeps its drawing buffer), crops to `area`, copies a PNG to the clipboard or downloads it when
  the browser refuses (plain-http servers). A copy shows a 'התמונה הועתקה' toast (spartan Sonner,
  `<hlm-toaster>` mounted once in `app.html`, dark, bottom-center); no state on the service.
- Map page: the map window cropped from the whole page — the map and a time chip at the top start
  corner, styled as a floating window, that exists only in the picture (the drawn loop frame's time, else the display time). Controls over the map
  (legend, level rail, loop pill, time-bar chip, hover chip, perf HUD) carry `data-screenshot-skip`; a
  picture-only element is `invisible` with `data-screenshot-only`. Frost renders as plain tint.

## Visual language

- **spartan/ui**: if spartan has the component, use it. Helm components are copied into
  `src/spartan/` (imported as `@spartan-ng/helm/*`) and are ours — fix RTL/theme issues there, no
  wrappers. Use spartan's own look; never restyle it to mimic old custom chrome.
- Our changes in the copies: button `soft` variant (`bg-secondary/50`, hover = full secondary);
  button `chip` variant + `chip` size (the value-chip pill: `variant="chip" size="chip"`);
  `hlm.ts` teaches tailwind-merge our `shadow-float` tokens (unknown custom classes don't override
  a component's own `shadow-md`/`bg-*` — register any new theme token there);
  `ghost` lost its `aria-expanded` background; switch, tabs and context-menu selectors translated
  to brain 1.0.4's `data-state` / `data-orientation`; switch thumb in px (`size-[12px]`/`[16px]`);
  tabs `browser` variant; the toaster uses the app font (`--brn-sonner-font-family`) and toasts hug their text, centered
  (`w-fit`, `rounded-xl`, smaller padding).
- Theme: dark by default (`class="dark"` on `<html>`), neutral-gray dark palette (card
  `oklch(0.195 0.005 260)`, background `0.153`, secondary/muted/accent `0.28`). Light theme
  untouched. In dark mode `primary` is near-white — tinted-primary bands are invisible.
- Font: `'Source Sans 3', 'Heebo'` — Latin and digits from Source Sans 3, Hebrew from Heebo by
  per-glyph fallback. Canvas sprites use the same stack.
- Docked chrome is solid `bg-card` (no blur, no seams). Floating windows (legend, level rail, loop
  pill, hover chip, HUD, settings popover) are `bg-background/70 backdrop-blur-lg`, `rounded-xl`,
  `shadow-float` (`shadow-float-sm` on small chips) — theme tokens in `styles.css`. Low quality
  (`.low-quality` on the home page host) swaps that frost for a 90% tint through one unlayered
  `styles.css` rule keyed on `backdrop-blur-lg` (`:root:has()` so portaled popovers follow) — keep
  the class name when adding a floating window.
- Value chips are `hlmBtn variant="chip" size="chip"` (menu values, ×N speed; the kft/mb toggle is
  a hand-sized sibling).
- Buttons: main rows and top-bar icons `secondary` when inactive; tiny value chips and chevrons
  `ghost`; selection lists switch `variant` (`default` ↔ `ghost`) + `aria-pressed`. A conditional
  style on `hlmBtn` = per-key `[class.x]` bindings or a new variant, never a `[class]` string.
- Motion: Angular `animate.enter` / `animate.leave` with keyframe tokens in `styles.css`
  (unfold/fold, expand/collapse, pop-in/out, rise/sink, widen/narrow). Legend bodies don't
  animate.
- Section headers: 11 px, semibold, tracked, muted.
- Adaptive map ink: white on the dark basemap, `#212429` on bright ones; text and line outlines `#0f172a`.
- RTL: logical properties only; direction islands use the CDK `Dir` directive; `dir` for notation
  goes on an inner span (on a positioned element it flips its own inset resolution).
- Restraint: the flattest rendering that carries the data; every decorative device (pattern, pill,
  outline, background shift) must earn its code.
- Layout taste: new UI grows out of existing chrome (the meteogram rises out of the time bar; the
  sounding table slides from the map's end edge — reuse that for portrait views) rather than a new
  floating panel; never take space it doesn't use; one continuous background inside a docked
  element; title / metadata / tabs visually distinct; tabs look like tabs; axis labels over data
  sit on their own solid strip; no dead middle with things pushed to one side.
- Tables: one quiet accent (a soft palette tint), hierarchy by size and mutedness, one font weight,
  a small dimmed unit in every cell, faint banding to tell columns apart.

## Rejected (don't re-offer)

- Full-bleed map with floating frosted cards — the map is a rounded window in solid chrome.
- Heebo's Latin, Manrope, DM Sans, Rubik, Space Grotesk, Inter, Plex, B612 — Source Sans 3.
- A dark/light theme toggle.
- A coordinates button in the top bar — it lives in settings.
- Readout color dots, a count badge on שכבות, a zoom pill, a keyboard-help overlay,
  prefers-reduced-motion, per-basemap border ink, static pressure labels on the rail, אוטו chips
  showing the resolved value.
- Wrap-box or behind-the-button panels for expanded layers.
- Lucide mountain or hand-drawn hills for the surface icon.
- Per-knob quality settings — one איכות setting.
- A measure ruler in the top bar — measuring starts from the chooser.
