---
inclusion: always
---

# Project Structure

The repository currently contains product briefs and a Launch Room spec; application directories below are the intended structure and should be added incrementally in task order.

```text
Docs/                              # Authoritative core brief and deferred optional brief
.kiro/specs/launch-room/           # Requirements, technical design, and implementation tasks
.kiro/steering/                    # Concise AI guidance
src/app/                           # App Router pages and direct API route handlers
src/app/room/[roomId]/             # Shared room UI
src/app/api/rooms/...              # Room, card, agent, review, and finalization routes
src/lib/db.ts                      # Sole owner of SQLite access and row mapping
src/lib/room-snapshot.ts           # Compact public and AI context projections
src/lib/openai.ts                  # Server-only OpenAI client/configuration
src/lib/agents/                    # Schemas, prompts, agent execution, finalization
db/schema.sql                      # Exact four-table strict SQLite schema
data/                              # Ignored runtime SQLite files
```

## Organization rules

- Prefer short, direct modules and route handlers. Do not add repository, service, or domain layers unless direct handlers become genuinely unmanageable.
- Keep client concerns in React components: browser identity, form state, polling, connection state, and the last valid snapshot. Clients never select trusted persisted metadata.
- Keep persistence concerns in `src/lib/db.ts`; use prepared statements, bound values, short transactions, and camelCase TypeScript mapped from snake_case SQL.
- Keep AI context construction and trust checks server-side under `src/lib/agents`; AI receives allowlisted compact context only.
- Use App Router conventions (`page.tsx`, `route.ts`), kebab-case module filenames, PascalCase components/types/schemas, and camelCase TypeScript/JSON fields.
- Preserve fixed enum order and values: sections `problem`, `requirements`, `risks`, `tasks`; statuses `active`, `proposed`, `approved`, `rejected`.
- Inspect and reuse before scaffolding. Make the smallest demo-critical change, avoid speculative dependencies and abstractions, and do not mix deferred optional enhancements into the core build.
