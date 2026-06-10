# Slice 0 review — lead's amendment list (2026-06-10)

> **Status: pending tree approval, then execution.** The lead reviewed the Slice 0 result before
> reading the code and gave the notes below. Code clarity/maintainability is the explicit top
> priority ("the codebase must be perfect at all times; performance can be optimized later").

## Code organization (top priority — tree must be clear before code review)

1. **Separate files per component**: template (`.html`), styles (`.css`), and logic (`.ts`) must be
   separate files — no inline templates/styles. Becomes a locked convention in CLAUDE.md §6.
2. **Clear, scalable folder tree**: proper folders for layers (file per layer type if needed),
   engine code, settings. Must scale to hundreds of layers, many pages, components, utilities,
   interfaces. Current tree judged "a huge mess" — restructure before implementation review.
3. **Quarantine non-product code**: everything that is mock/spike/perf-tooling (fixture wiring,
   demo controls, perf HUD) must be clearly separated from real product code so the real code can
   be read on its own. Utility functions that are genuinely reusable stay in the real tree.

## Functional changes

4. **Routing**: the map is the front page at `/` directly — no `/map` path, no redirect.
5. **Fixture model sizes are wrong**: big model should be ~1/4 the size of the current big one;
   the small model ~1/2 the size of the (new) big one. (Exact semantics — extent vs point count —
   clarified with the lead before execution.)
6. **Fixture realism**: temperature and especially wind should *somewhat* resemble real fields
   (not 1:1). Current wind direction field is "a mess" — replace with flow around synthetic
   pressure systems.
7. **Bug — pan misalignment**: panning the map (up/down) leaves the data layers misaligned
   relative to the basemap.
8. **Bug — 2D view**: after toggling to 2D, the basemap works but the data layers do not render
   correctly.
9. **Remove the attribution control** at the bottom of the map.
10. **Layer transparency**: make the data layer more transparent so the basemap clearly shows
    through on all three styles.
11. **Colorful basemap** is "a bit weird" (dark + light approved as great). Details clarified with
    the lead.

## Standing instructions reaffirmed by the lead

- Ask questions freely and often — he prefers answering many questions over re-explaining later.
- Highest standards on readability/maintainability; that is where he focuses most.
