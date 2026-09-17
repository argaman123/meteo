---
name: shortcuts-are-primary-ux
description: "Layer-menu shortcuts (bundles) are the main user surface; per-layer groups are the expert drawer; some parameters (hgt, slp) exist mainly inside bundles"
metadata: 
  node_type: memory
  type: project
  originSessionId: 3d3fb905-26ad-4354-9858-7491977c7da0
---

Lead (2026-07-14): most users will only use the shortcuts section — bundles like "temperature colormap + wind particles + hgt contours". The per-layer groups with look checkboxes/settings are for experienced users and niche tweaks. Some parameters would never be standalone menu buttons: geopotential height (hgt) is auto-included in most shortcuts, sea-level pressure (slp) likewise when it lands.

**Why:** the menu hierarchy should weight bundles as the default path; layer-level UI is secondary.

**How to apply:** when adding layers or menu features, ask which shortcuts they join rather than only where their button goes; keep the shortcuts section first-class ([[layer-menu-ux-taste]], [[dynamic-task-pool]]).
