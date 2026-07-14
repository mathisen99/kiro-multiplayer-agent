---
inclusion: always
---

# Structure

- Use `src/app` for App Router pages and direct `src/app/api/rooms/**/route.ts` handlers.
- Keep browser identity, forms, polling, connection state, and the last valid snapshot in React client code. Clients never select trusted persisted metadata.
- Keep SQLite access and snake_case-to-camelCase mapping in `src/lib/db.ts`; keep compact snapshot projections in `src/lib/room-snapshot.ts`.
- Keep server-only AI schemas, prompts, execution, context allowlists, and finalization under `src/lib/agents`; keep OpenAI configuration in `src/lib/openai.ts`.
- Prefer short direct modules. Do not introduce repository, service, or domain layers unless direct handlers become unmanageable.
- Preserve section order `problem`, `requirements`, `risks`, `tasks` and statuses `active`, `proposed`, `approved`, `rejected`.
- Make only the smallest demo-critical change and stop at blockers for the required journey or validation gate.
