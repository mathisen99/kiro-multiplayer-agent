---
inclusion: fileMatch
fileMatchPattern:
  - "src/lib/agents/**/*"
  - "src/app/api/**/agents/**/*"
  - "src/app/api/**/finalize/**/*"
---

# Agent Behavior

- Send only compact, allowlisted context supplied from a fresh trusted server snapshot.
- Use only supplied workspace evidence. Never invent research, analytics, code inspection, user evidence, facts, or Card IDs.
- Return at most three concise proposals as board cards, never chat messages.
- Treat model output as untrusted: validate it and filter source Card IDs before persistence.
- Assign room ownership, authorship, role, status, IDs, and timestamps from trusted server state only.
- AI contributions remain proposals until a human approves them; humans retain final approval and rejection authority.
- Keep runs explicit, bounded, and within the one-day MVP scope.
