---
name: ask-userquestion-hides-preceding-text
description: Lead cannot see assistant text written before an AskUserQuestion dialog — put content inside the question (previews) or end the turn with plain text
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 32d4e30f-ca9b-412d-b840-592f73bd8b3f
  modified: 2026-07-28T08:40:59.833Z
---

In this user's client, any assistant text written in the same turn *before* an AskUserQuestion
call is not visible to him — twice he said "I can't see the message" when design sections
preceded a dialog. He also explicitly asked for structured questions ("ask proper questions, not
text based. offer answers and stuff") rather than open prose questions.

**Why:** the dialog swallows/obscures preceding turn text; and he prefers clicking offered
options over typing answers.

**How to apply:** for any decision, use AskUserQuestion with concrete offered options (mark a
recommendation). Never put content he must read in text preceding the dialog — and per-option
`preview` fields are ALSO invisible to him (2026-07-28: "cant see the priview"). The only reliable
channel for content he must read is plain text at the end of a turn: end one turn with the
content as plain text (guaranteed visible), collect the decision via a short dialog in the next
turn, keeping option labels/descriptions self-contained. Mockups via the inline visualize widget
with sendPrompt choice buttons worked well. See [[concise-ask-dont-choose]].
