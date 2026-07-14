---
inclusion: always
---

# Product

Launch Room is a one-day demo MVP where two nickname-only browser participants turn planning cards into an implementation-ready Markdown plan with one invited Product Agent.

- Prioritize the required two-browser journey over feature breadth, abstraction, polish, or broad tests.
- AI contributes only 1–3 proposed board cards from compact supplied workspace context; it never acts as chat or overwrites human cards.
- Humans approve or reject every AI proposal. Finalization uses only active human cards and approved AI cards.
- Anonymous links and Client IDs coordinate the demo; they are not production authentication.
- Fix only demo or validation blockers. Once the required journey and `pnpm run verify` pass, stop; do not add optional enhancements.
- Treat `Docs/CODEX_BUILD_CANVAS_LAUNCH_ROOM_CORE.md` as the authoritative scope boundary.
