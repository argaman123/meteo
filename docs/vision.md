# Product Context

A **specialized meteorological viewer**: a map layered with colorful, animated weather data. It
resembles Windy on the surface but exists for needs off-the-shelf tools can't satisfy.

## What it must do (all four)

- **Regional data** — its own high-res regional models and sources next to the global ones.
- **Domain tools** — point forecasts, soundings, forecaster products, not just pretty maps.
- **Integration** — reads its own backend's data and products.
- **Fully offline** — runs with no internet: every asset is self-hosted, and it must keep working
  at all times.

⇒ The architecture must stay an **extensible framework for many domain tools and data types**, not
a fixed app.

## Users & deployment

A wide spectrum, from expert forecasters to casual viewers, served by **one shared deployment**.
Per-group differences ride on **presets/config**, not roles or logins.

## Two sites: clients and meteorologists

The client site **visualizes** model data, observations and the meteorologists' published products.
A meteorologist site (later) looks different and adds **authoring** — drawing and editing polygon
maps — on the same layers, services and engine. Supporting the second site must change as little
TypeScript as possible: new pages, never forks of shared code.

## Dominant usage

1. **Explore** layers over a region (pan/zoom, toggle, scrub time).
2. **Point/location forecast** (read details for a place/asset).
3. **Monitoring** — always-on, often on wall displays.
4. **Briefing & decision support** — assemble a picture to make a weather call.

## Layer-menu usage model (lead, 2026-07-14)

**Shortcuts (bundles) are the primary interaction** — most users pick a preset like מזג אוויר
(temperature colors + wind animation + geopotential contours) and never open the per-layer groups.
The individual layers with their look checkboxes and settings are the **experienced-user / niche
surface**. Some parameters exist mainly *inside* bundles and would never be a primary standalone
button — geopotential height rides along in most shortcuts, sea-level pressure similarly when it
lands. Design menu emphasis accordingly.

## Design principle

**Function & data-completeness first, polish second.** Modern/clean by default, but never hide a
needed value for a prettier layout — *"as nice as the need allows."*
