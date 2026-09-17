---
name: breathing-tree-rule
description: "Code organization is a \"breathing system\" — place things generally right, don't over-split, and proactively suggest reorganizations for the lead to decide every time"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 1d030bf7-323d-40b5-a777-592d2a7f97f1
---

The lead's organization philosophy (2026-06-10): files/folders are placed "generally right" — similar functions share a file, folders gain subfolders only when a flat list turns vague. Whenever a file grows too large or a folder becomes cluttered, proactively raise it with a concrete reorganization suggestion; **he decides, every single time** — never restructure silently and never pre-split for an imagined future.

**Why:** he has very high standards for a tree that stays readable for rotating juniors over years, but hates premature fragmentation (rejected one-function-per-file utils and a `wind/` folder as absurd over-splitting).

**How to apply:** when touching code, watch file sizes and folder clutter; end the relevant response with a short "this file/folder is getting crowded — suggest splitting X into Y" and wait for his call. Also recorded in CLAUDE.md §2. See [[concise-ask-dont-choose]].
