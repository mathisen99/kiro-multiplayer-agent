---
inclusion: always
---

# Product

Launch Room is a one-day demo MVP where two nickname-only browser participants turn planning cards into an implementation-ready Markdown plan with help from one invited Product Agent.

## Core journey

1. Create and share a room; join from a second browser without an account.
2. Add and edit cards in `problem`, `requirements`, `risks`, and `tasks`; synchronize them by polling without manual refresh.
3. Explicitly invite and run the Product Agent. AI output appears as 1–3 proposed cards, never as chat.
4. Humans approve or reject every AI proposal.
5. Finalize, preview, copy, and download Markdown generated only from active human cards and approved AI cards.

## Product rules

- Reliability of the required demo journey outranks feature breadth, abstraction, polish, and broad test coverage.
- Humans retain final authority. AI must not overwrite human cards, approve its own output, invent evidence, or assign trusted metadata.
- Keep AI calls explicit, bounded, and based only on compact supplied workspace context.
- Treat anonymous links and browser client IDs as demo coordination, not production authentication.
- Do not implement optional enhancements until the core smoke test and `pnpm run verify` pass. Stop once the MVP gate passes; fix blockers only.
- The authoritative scope boundary is `Docs/CODEX_BUILD_CANVAS_LAUNCH_ROOM_CORE.md`; requirements refine behavior, design refines architecture, and tasks define implementation order.
