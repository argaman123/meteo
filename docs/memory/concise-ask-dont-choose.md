---
name: concise-ask-dont-choose
description: "How to communicate with this user — concise summaries, ask instead of assume, offer ideas for approval but never auto-choose"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 45f798d6-31ed-4caf-a82c-866970b0e1a8
  modified: 2026-07-30T08:51:38.923Z
---

The user (solo senior lead on the meteo platform) gave explicit working-style feedback during plan review.

**Why:** I over-explained summaries, and phrased some open design choices as "I'll do X" instead of offering them. He wants control at every step and minimal reading overhead.

**How to apply:**
- Summaries: short. Explain only when a comparison/trade-off needs it.
- Assume even less than feels natural — ask, even for small things.
- Offer ideas as options for his approval; never silently pick, even with an obvious default.
- He cannot run real checks on target hardware (mini-PCs, inside network) — give reasoned assessments instead, clearly labeled as such; never plan steps that require him to verify on real hardware.
- He provides domain inputs himself (mock data in exact real format, photos/descriptions of the old app) — don't fetch public substitutes or build mock infrastructure unasked.
- **A bare "rename X" is a request for OPTIONS, not a delegation** (2026-07-30: "why aren't you asking when I say to rename? you can't know what I want without asking"). When he asks to rename without giving the name, offer candidates via a structured question — never apply my own pick. His choice that time: `takeIfRelevant` — he thinks in **Kotlin idioms** (takeIf); Kotlin-flavored names are welcome candidates.
- **An approved option does NOT approve the assumptions embedded in its description** (2026-07-30, jump-union blowup: "that's where it's all wrong!! I know something was off and you didn't ask or make sure"). I'd tucked "the hourly grid adds stops anyway, odd map times become extra stops" into a recommended option's description; he picked it, and the union semantics went unexamined until he caught a 14:30 stop appearing mid-grid. Behavioral edge cases (what EXACTLY happens in the mixed case, with a concrete example) get their own question — never ride along inside an option blurb.
