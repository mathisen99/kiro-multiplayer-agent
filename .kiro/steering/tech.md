---
inclusion: always
---

# Technology

- Use the exact pinned pnpm stack: Node `24.18.0`, Next.js App Router `16.2.10`, React `19.2.7`, TypeScript `6.0.3`, Tailwind `4.3.2`, SQLite through `better-sqlite3` `12.11.1`, OpenAI SDK `6.46.0`, Zod `4.4.3`, and `react-markdown` `10.1.0`.
- Keep one local Next.js Node process and one local SQLite file. Use raw prepared SQL; do not add an ORM, hosted data service, UI framework, or test infrastructure.
- Database routes export `runtime = "nodejs"`; `src/lib/db.ts` owns connection setup, schema application, SQL, transactions, and row mapping.
- Validate HTTP and AI boundaries with Zod. Trusted server code assigns persisted IDs, timestamps, ownership, authorship, roles, and statuses.
- Keep OpenAI configuration server-only. Use the Responses API with structured output, `store: false`, no tools or autonomous loops, and never hold a transaction open during an AI request.
- Validate with `pnpm run check:quick`, `pnpm run lint`, and `pnpm run verify`; fix submission blockers only.
