---
name: plan-execution-workflow
description: "How to handle plans/specs with this user — he doesn't read them; execute inline, never subagent-per-task"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5361a6fa-abb4-4c08-a400-658d290fecb1
---

He **never reads plan or spec documents** and will not review them — do not gate work on "please review the plan." When a plan is ready, execute it **inline** (the executing-plans path), surfacing progress as concrete code at checkpoints he can react to. **Never** use subagent-per-task / subagent-driven execution.

**Why:** he reacts to real code, not documents; per-task subagent dispatch is too much ceremony for how he works. He said this explicitly (2026-06-21) and noted he'd told me before.

**How to apply:** still write a plan/spec when the work warrants it (for your own structure + resumability per [[design-first-concise]]), but don't ask him to read or sign off on the document — settle open decisions in chat instead, then just start building inline and show code. This extends to **design summaries in chat**: after the structured questions are answered, don't post a multi-section design and ask "good to build?" — he won't read it ("im not reading all that. code and ill review", 2026-07-07). The AskUserQuestion answers ARE the approval; go straight to code and let him review the working result. Related: [[concise-ask-dont-choose]], [[match-proven-look-exactly]].
