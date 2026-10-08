# Meteo — Codex entry point

Read `CLAUDE.md` first: it is the project's rules, tree, conventions and traps, and it applies to
you exactly as written (Claude-only tool names there have obvious Codex equivalents). Then read the
`docs/` file for the area you touch. Current user instructions take precedence.

Record new lessons where CLAUDE.md says to — never in a separate notes folder. Do not create
migration reports, transcript archives or converted skills.

Approved skills are in `.agents/skills/`: `frontend-design`, `angular-developer`, `angular-v22`,
and upstream Superpowers `brainstorming` (for design discussion only — settle choices in concise
questions, then execute inline; never require written-spec approval, auto-commit or dispatch
subagents because the skill suggests it). Keep upstream skills intact. Use both Angular skills and
resolve disagreements against the installed packages and the official Angular docs.

Project MCP configuration lives in `.codex/config.toml`: Angular CLI, Spartan UI, Playwright.
