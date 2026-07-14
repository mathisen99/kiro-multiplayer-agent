---
inclusion: always
---

# Technology

> The repository is currently specification-only. The stack and commands below are the required implementation baseline, not yet verified project behavior.

## Fixed stack

- Node.js `24.18.0` with pnpm and committed `pnpm-lock.yaml`
- Next.js App Router `16.2.10`, React/React DOM `19.2.7`, TypeScript `6.0.3`
- Tailwind CSS and `@tailwindcss/postcss` `4.3.2`; PostCSS `8.5.19`
- Local SQLite via `better-sqlite3` `12.11.1`; raw prepared SQL, no ORM
- OpenAI JavaScript SDK `6.46.0` using the Responses API and structured output
- Zod `4.4.3`, `react-markdown` `10.1.0`, Lucide, `clsx`, and `tailwind-merge`
- ESLint `10.7.0` with `eslint-config-next` `16.2.10`

Pin exact versions; do not use `latest`, caret ranges, prereleases, a UI framework, or new test infrastructure. Use TypeScript, the `src` directory, and the `@/*` import alias.

## Runtime and boundaries

- Run one local Next.js Node process with one local SQLite file; this is not a serverless or multi-instance architecture.
- Database routes must export `runtime = "nodejs"`. `src/lib/db.ts` owns SQL, schema startup, transactions, row mapping, and the process-wide connection.
- Validate HTTP and AI boundaries with Zod. Generate IDs, timestamps, ownership, authorship, roles, and statuses on the server.
- Keep OpenAI configuration server-only; use `store: false`, no tools or autonomous loops, low reasoning for agent runs, and medium reasoning for finalization.
- Never hold an SQLite transaction open during an external AI request.

## Commands

Once the application is scaffolded, package scripts must provide:

```bash
pnpm run check:quick  # tsc --noEmit
pnpm run lint         # eslint .
pnpm run check        # check:quick, then lint
pnpm run build        # Next.js production build
pnpm run verify       # check, then build
```

The validation gate is `pnpm run verify` followed by the exact two-browser manual journey in the requirements. No build, test, lint, or run command is executable yet because `package.json` has not been created.
