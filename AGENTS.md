# Meteo — Codex entry point

This migration covers the Meteo frontend only.

At the start of each task:
1. Read `CLAUDE.md` for project rules, architecture, and the current status (§11).
2. Read `docs/vision.md` and `docs/memory/MEMORY.md`.
3. Read the memory files and existing docs relevant to the task before changing code.
   Read `docs/plan.md` when choosing or continuing work; the user chooses the next task.

The memory files were copied unchanged from this project's Claude memory. Apply their
preferences to Codex; references to Claude-only tools, paths, or skills are historical,
not instructions to recreate or install them. Current user instructions take precedence;
later recorded decisions supersede older ones.

Confirmed checkpoint: settings panel v1, commit `81387e8` (August 26, 2026).
The user confirmed no newer work or change of direction; no next feature was selected.

Keep replies short and ask concise questions about unresolved choices. Maintain project
knowledge in the existing docs and `docs/memory/`, updating the memory index when needed.
Do not create duplicate migration reports, transcript archives, or converted skills.
Commit only when explicitly requested.

Approved skills are in `.agents/skills/`: `frontend-design`, `angular-developer`,
`angular-v22`, and upstream Superpowers `brainstorming` (including its visual companion).
Use Frontend Design for intentional web-app design while preserving Meteo's approved
references, RTL layout, typography, and Spartan conventions. Use both Angular skills;
resolve disagreements against installed packages and current official Angular docs.
The user chose Superpowers for brainstorming and design discussion only. Its references
to writing-plans/TDD/execution skills do not enable that broader workflow here: settle
choices in concise questions, then execute approved work inline under the existing project
agreements. Do not install the workflow chain, require written-spec approval, auto-commit,
or dispatch subagents because the upstream skill suggests it. Keep upstream skills intact.

Project MCP configuration lives in `.codex/config.toml`: Angular CLI, Spartan UI, Playwright.
