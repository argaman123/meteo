# Product Context

> Trimmed 2026-07-06 (lead): the old "complete capability inventory" and pillar roadmap are
> deleted — they mixed the lead's actual intent with extrapolation and drove planning he never
> asked for. What remains here is context that is *true*, not a plan. The forward plan is rebuilt
> with the lead, feature by feature (see CLAUDE.md §11 working mode).

A **specialized meteorological viewer** for a closed/secure internal network: a map layered with
colorful, animated weather data. It resembles Windy on the surface but exists for reasons
off-the-shelf tools can't satisfy.

## Why it exists (all four)

- **Proprietary / regional data** — in-house and regional high-res models and sources others lack.
- **Domain-specific tools** — built for defense/aviation/maritime/emergency workflows.
- **Integration** — ties into internal operational systems and data.
- **Security** — runs entirely inside a closed network on sensitive data.

⇒ The architecture must stay an **extensible framework for many domain tools and data types**, not
a fixed app.

## Users & deployment

Wide spectrum — **defense/military, aviation & maritime, emergency & public, and casual users** —
served by **one shared deployment**. Per-group differences ride on **presets/config**, not roles or
logins (access is network-trusted).

## It is a viewer, not an authoring tool

A separate team of weathermen authors products in a **different** app. This app **publishes and
visualizes** those products alongside model data and observations. We do **not** build
authoring/editing here.

## Dominant usage

1. **Explore** layers over a region (pan/zoom, toggle, scrub time).
2. **Point/location forecast** (read details for a place/asset).
3. **Situational monitoring** — always-on, often on control-room walls.
4. **Briefing & decision support** — assemble a picture to drive a go/no-go call.

## Design principle

**Function & data-completeness first, polish second.** Modern/clean by default, but never hide a
needed value for a prettier layout — *"as nice as the need allows."*
