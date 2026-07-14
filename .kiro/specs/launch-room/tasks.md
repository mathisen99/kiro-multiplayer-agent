# Implementation Plan: Launch Room

## Overview

Implement the submission-critical one-day MVP in dependency order: establish the exact pinned Next.js baseline, add trusted local persistence, deliver the real two-browser planning flow, add one explicitly invoked Product Agent with human review, generate a lossless Markdown artifact, and stop after the required demo journey and validation gate pass. Do not implement optional enhancements or add heavy testing infrastructure.

## Tasks

- [ ] 1. Establish the exact pinned foundation and validation commands
  - [ ] 1.1 Scaffold or adapt the existing repository to the fixed Next.js App Router, React, TypeScript, and Tailwind structure
    - Inspect and preserve usable repository code before scaffolding; configure the `@/*` alias and `src` directory without introducing speculative layers.
    - Pin Node `24.18.0` in `.nvmrc`, set `engines.node` to `24.x`, and use the exact runtime and development dependency versions specified by the core brief.
    - Commit a reproducible `pnpm-lock.yaml`; do not use caret ranges, `latest`, prereleases, an ORM, a UI framework, or a testing dependency.
    - _Requirements: 1.1, 1.4, 8.1, 9.1, 9.2_
  - [ ] 1.2 Configure runtime examples, ignored files, and the required validation scripts
    - Add `.env.example` with `OPENAI_API_KEY`, `OPENAI_AGENT_MODEL=gpt-5.6-luna`, and `DATABASE_PATH=./data/launch-room.db`, keeping secrets server-only.
    - Add `data/.gitkeep` and ignore SQLite `.db`, `.db-shm`, and `.db-wal` runtime files.
    - Define `check:quick` as `tsc --noEmit`, `lint` as `eslint .`, `check` as `pnpm run check:quick && pnpm run lint`, and `verify` as `pnpm run check && pnpm run build`.
    - _Requirements: 8.4, 8.9, 9.3, 10.5_

- [ ] 2. Implement the SQLite schema, trusted data helper, and shared contracts
  - [ ] 2.1 Create the exact four-table SQLite schema and process-wide database connection
    - Add `db/schema.sql` with only `rooms`, `participants`, `cards`, and `agent_runs`, their constraints, room indexes, and room-level final artifact fields.
    - Implement `src/lib/db.ts` with parent-directory creation, a development-safe `globalThis` singleton, idempotent schema application, WAL, foreign keys, a 5-second busy timeout, prepared statements, bound values, and source-ID JSON mapping.
    - Generate persisted UUIDs and ISO timestamps only in trusted server code; keep every multi-record write in one short transaction.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6, 8.7, 8.8_
  - [ ] 2.2 Define compact shared validation, snapshot, sorting, and Safe Error contracts
    - Add Zod schemas and TypeScript types for room creation/join, human cards, snapshots, participant/card status enums, and compact Safe Error responses.
    - Implement deterministic card ordering by fixed section rank, creation time, and Card ID; omit client IDs, rejected cards, secrets, run internals, and duplicate rough-idea data from public snapshots.
    - Keep validation and route helpers direct and small rather than introducing repository, service, or domain layers.
    - _Requirements: 2.7, 3.5, 3.6, 4.4, 8.5, 8.8, 8.9_

- [ ] 3. Add concise Kiro guidance and demo-readiness artifacts
  - [ ] 3.1 Create always-included and file-matched Steering files
    - Add concise `.kiro/steering/product.md`, `tech.md`, and `structure.md` files with `inclusion: always` covering the one-day goal, fixed stack, direct boundaries, and stop-at-demo-blockers rule.
    - Add `.kiro/steering/agent-behavior.md` matched only to agent/finalization server files, requiring compact supplied context, no invented evidence, at most three proposals, trusted server metadata, and human approval authority.
    - _Requirements: 1.1, 1.3, 5.5, 5.8, 9.7; Kiro Project Artifacts_
  - [ ] 3.2 Create the post-task quality Hook, demo-readiness Skill, and honest checklist
    - Add `.kiro/hooks/quality-gate.json` with one enabled `PostTaskExec` command that runs `pnpm run check:quick` with the prescribed timeout.
    - Add `.kiro/skills/demo-readiness/SKILL.md` that checks only the required journey, artifact eligibility, export behavior, and validation gate, and reports only submission blockers.
    - Add `KIRO_DEMO_CHECKLIST.md` with the prescribed manual Kiro UI steps without claiming any action has already occurred.
    - _Requirements: 10.5, 10.6; Kiro Project Artifacts_

- [ ] 4. Deliver room creation, joining, snapshots, and the real presentable board vertical slice
  - [ ] 4.1 Implement atomic room creation, room retrieval, and nickname-only joining routes
    - Add Node-runtime route handlers for `POST /api/rooms`, `GET /api/rooms/[roomId]`, and `POST /api/rooms/[roomId]/join` with Zod parsing, ownership checks, prepared SQL, compact responses, and Safe Errors.
    - Create the room, creator participant, and initial active human Problem card in one transaction; persist browser membership by `clientId`, and return a safe 404 for unknown rooms.
    - Ignore client-supplied trusted metadata and perform no partial write for invalid input.
    - _Requirements: 2.1, 2.2, 2.3, 2.7, 2.8, 8.5, 8.6, 8.7, 8.8_
  - [ ] 4.2 Build the home flow, joined-state gate, room snapshot shell, and board-first layout
    - Implement the `Launch Room` home page and creation form with all required fields, `Create workspace`, `No account required for this demo`, browser UUID/nickname storage, and redirect to `/room/[roomId]` only after success.
    - Implement `/room/[roomId]` with a nickname join form, room header/goal, share-link copy control, participants, connection placeholder, Product Agent/final artifact control areas, and exactly four fixed board sections.
    - Render real API state with clear loading, empty, missing-room, and Safe Error states in a restrained high-contrast board-dominant desktop UI.
    - _Requirements: 2.4, 2.5, 2.6, 2.8, 3.1, 10.1, 10.2, 10.3, 10.4_

- [ ] 5. Add server-authoritative human card creation and editing
  - [ ] 5.1 Implement human card create and edit route handlers
    - Add Node-runtime handlers for `POST /api/rooms/[roomId]/cards` and `PATCH /api/rooms/[roomId]/cards/[cardId]` with strict section/title/content validation and same-room participant/card checks.
    - Assign active status, authorship, ownership, IDs, and timestamps from server state; limit edits to same-room active human cards and editable fields, checking affected-row counts.
    - Return Safe Errors without mutation for invalid, missing, agent-authored, or cross-room targets.
    - _Requirements: 3.2, 3.3, 3.5, 3.6, 8.5, 8.6, 8.7, 8.8_
  - [ ] 5.2 Wire human card composition and editing into the four-section board
    - Add compact create and edit interactions against the real routes, refetch after success, preserve visible board state on recoverable failure, and display field-level or Safe Error feedback.
    - Render human authorship and timestamps as useful, but never expose edit controls for AI-authored cards.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 10.2, 10.4_

- [ ] 6. Implement non-overlapping polling synchronization and recovery
  - [ ] 6.1 Add the room polling state machine and connect all local mutations
    - Fetch immediately on entry, schedule the next request only after the current request settles, poll visible tabs at about 1.25 seconds, pause while hidden, and refetch immediately on visibility restoration or successful mutation.
    - Validate every snapshot before replacement, retain the last valid state on failure, abort on unmount, queue at most one immediate refresh, and defensively apply deterministic card ordering.
    - Show `Reconnecting` with approximately 1.25, 2.5, and capped 5 second retry delays; reset to normal polling and `Live` after recovery.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 10.4_

- [ ] 7. Implement Product Agent invitation and one bounded structured run
  - [ ] 7.1 Add invitation and trusted Product Agent execution routes
    - Implement `POST /api/rooms/[roomId]/agents` to add the single Product Agent idempotently after same-room human resolution and without making an AI request.
    - Add server-only OpenAI setup plus agent Zod schemas, compact prompts, and `POST /api/rooms/[roomId]/agents/[participantId]/run` using the Responses API, `store: false`, low reasoning, no tools, and exactly one bounded request.
    - Commit a `running` Agent Run first, perform the external AI call outside every SQLite transaction, then use one short transaction to insert all 1–3 proposals and complete the run.
    - Validate output, filter source IDs to the fresh eligible room context, and assign proposal/run IDs, invited Product Agent ownership, authorship, role, timestamps, and `proposed` status on the server; mark failure safely when possible without changing existing cards.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 8.6, 8.9, 9.3, 9.4, 9.5, 9.6, 9.7_
  - [ ] 7.2 Add explicit invite/run controls and structured proposal cards
    - Show only the Product Agent runtime role, invitation state, an instruction input limited to 300 characters, an explicit `Run teammate` action, busy/retry states, and `Teammate could not complete this run` on failure.
    - Render 1–3 proposals inside board sections—not chat—with Product Agent identity/role, `Proposed` badge, title, content, rationale, valid source links, and no edit affordance.
    - _Requirements: 5.1, 5.2, 5.3, 5.6, 5.10, 6.1, 10.2, 10.3, 10.4_

- [ ] 8. Preserve human authority with guarded proposal approval and rejection
  - [ ] 8.1 Implement proposal review route and board controls
    - Add `POST /api/rooms/[roomId]/cards/[cardId]/review`, resolve the initiating participant, and conditionally transition only a same-room agent card currently `proposed` to `approved` or `rejected` in one transaction.
    - Add Approve and Reject controls, immediately refetch after success, hide rejected cards from the default snapshot, and preserve all human cards and every invalid target's prior status.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.6, 8.8_

- [ ] 9. Generate, store, preview, copy, and download the final eligible artifact
  - [ ] 9.1 Implement trusted finalization and atomic artifact replacement
    - Build finalization context from exactly active human cards and approved AI cards, excluding proposed/rejected cards, rationales, run data, and internal metadata.
    - Add the Node-runtime `POST /api/rooms/[roomId]/finalize` handler using one Responses API structured request with `store: false`, medium reasoning, no tools, and server-only configuration.
    - Validate title/Markdown lengths and every required heading in order before atomically replacing the room artifact; keep the prior artifact and all cards unchanged on any failure and return a retryable Safe Error.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.8, 8.5, 8.6, 8.8, 9.3, 9.4, 9.5, 9.6_
  - [ ] 9.2 Implement resilient stored-Markdown preview and lossless export
    - Add generate/retry controls and a drawer or dialog that renders stored Markdown with `react-markdown` and never `dangerouslySetInnerHTML`.
    - Copy the complete stored Markdown unchanged and download identical bytes as `launch-room-<non-empty-safe-title-slug>.md`; isolate preview errors so copy and download remain available.
    - _Requirements: 7.5, 7.6, 7.7, 7.8, 10.2, 10.4_

- [ ] 10. Harden only the required demo path and close the validation gate
  - [ ] 10.1 Finish demo-blocking states, README warning, and scope audit
    - Ensure recoverable database, synchronization, Agent Run, and finalization failures retain the last valid room content and expose a retry path; remove accidental optional features and verbose/secret-bearing logs.
    - Add the exact README warning that anonymous links and Client IDs are demo conveniences and the app is unsuitable for confidential data, production authorization, serverless deployment, or multiple app instances.
    - Verify the UI remains board-first and recording-ready without adding extra AI roles, push infrastructure, auth, drag-and-drop, chat, broad tests, or any optional enhancement.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.9, 8.10, 10.3, 10.4, 10.7, 10.8_
  - [ ] 10.2 Run `pnpm run verify` and fix only submission blockers
    - Run TypeScript checking, ESLint, and the production build through `pnpm run verify`; resolve all blocking type, lint, build, native SQLite, route-runtime, and configuration issues without expanding scope.
    - _Requirements: 1.2, 1.3, 10.5, 10.6_
  - [ ] 10.3 Execute the exact two-browser Required Demo Journey once
    - Use `Weekend Launch`, the prescribed goal and rough idea, Alex in the first browser, Sam in a private/incognito session, and the exact teammate instruction.
    - Confirm initial Problem creation, nickname join, Sam's Requirement appearing for Alex without refresh, invitation without an AI call, 1–3 proposed cards, human approval/rejection, and rejected-card hiding.
    - Confirm finalization includes active human and approved AI content only, excludes proposed/rejected content and rationales, and supports preview, byte-for-byte copy, and safe Markdown download.
    - Record only the pass result or concrete demo blockers; do not claim Kiro UI actions that were not performed.
    - _Requirements: 2.1-2.6, 3.1-3.4, 4.1-4.7, 5.1-5.10, 6.1-6.5, 7.1-7.8, 10.6; Required Demo Journey_
  - [ ] 10.4 Update implementation task checkboxes and stop at the MVP cut line
    - Mark each completed task as implementation proceeds, leave any blocked item visibly incomplete, and stop when `pnpm run verify` plus the single exact smoke test pass.
    - Do not continue into `CODEX_BUILD_CANVAS_LAUNCH_ROOM_OPTIONAL_ENHANCEMENTS.md` or add deferred features after the gate succeeds.
    - _Requirements: 1.2, 1.3, 1.4; Definition of Done_

## Notes

- `Docs/CODEX_BUILD_CANVAS_LAUNCH_ROOM_CORE.md` is the authoritative scope boundary.
- The fixed implementation language is TypeScript.
- No test task adds a test runner, property-testing library, browser automation, coverage tooling, model evaluation, load test, or multi-browser matrix. The design correctness properties remain implementation invariants reviewed through schemas, trusted projections, guarded transactions, `pnpm run verify`, and the one required smoke test.
- AI network calls must always occur outside SQLite transactions. Only short pre-call and post-call database mutations may be transactional.
- Humans retain final authority: AI writes only proposed cards, and only active human or approved AI cards are eligible for finalization.
- Update checkboxes as work completes; fix demo blockers only after the validation phase begins.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "3.1"] },
    { "id": 3, "tasks": ["2.2", "3.2"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["4.2", "5.1"] },
    { "id": 6, "tasks": ["5.2"] },
    { "id": 7, "tasks": ["6.1", "7.1"] },
    { "id": 8, "tasks": ["7.2", "8.1"] },
    { "id": 9, "tasks": ["9.1"] },
    { "id": 10, "tasks": ["9.2"] },
    { "id": 11, "tasks": ["10.1"] },
    { "id": 12, "tasks": ["10.2"] },
    { "id": 13, "tasks": ["10.3"] },
    { "id": 14, "tasks": ["10.4"] }
  ]
}
```
