---
name: demo-readiness
description: Verify the Launch Room challenge demo and report only submission-blocking problems. Use before recording or submitting the project.
---

# Demo Readiness

## Workflow

1. Run the exact Required Demo Journey from `.kiro/specs/launch-room/requirements.md` in two browser sessions: create as Alex, join as Sam, add a human card, confirm polling, invite and explicitly run the Product Agent, then approve and reject proposals.
2. Confirm AI output is 1–3 proposed board cards rather than chat and that rejected cards disappear from the default board.
3. Generate the Final Artifact and confirm eligibility is exact: include active human and approved AI cards; exclude proposed and rejected cards, proposal rationales, and unsupported evidence.
4. Confirm preview uses the stored Markdown, copy preserves it unchanged, and download emits identical bytes with a safe non-empty `launch-room-<title-slug>.md` filename. Copy and download must remain available if preview fails.
5. Run `pnpm run verify`.
6. Report only concrete blockers to the required journey, artifact eligibility, export behavior, or validation gate. Do not expand scope or claim an unperformed check passed.
