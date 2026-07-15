# Launch Room

Launch Room is a local demo workspace where nickname-only participants can shape a planning board, brainstorm with three AI specialists, review their proposed cards, and export an approved Markdown plan.

**Repository:** [github.com/mathisen99/kiro-multiplayer-agent](https://github.com/mathisen99/kiro-multiplayer-agent)

## Quick start

Requirements: Node.js 24 and pnpm 11.

```bash
cp .env.example .env
pnpm install
pnpm run dev
```

Add your OpenAI API key to `.env` before messaging an AI specialist:

```env
OPENAI_API_KEY=your-key-here
OPENAI_AGENT_MODEL=gpt-5.6-luna
DATABASE_PATH=./data/launch-room.db
```

Open [http://localhost:3000](http://localhost:3000), fill in the room details, and select **Create workspace**. The browser is redirected to the new shareable room URL.

To demo collaboration, copy the invite link and open it in a private/incognito browser window. Join with a second nickname; card changes synchronize automatically while both tabs are visible.

If you open the development server from another device, use the Network URL printed by Next.js. When your LAN address differs from the value in `next.config.ts`, add that hostname to `allowedDevOrigins` and restart the server.

## Demo flow

1. Create a workspace with a name, goal, rough idea, and nickname.
2. Share the room URL and join from a second browser session.
3. Add or edit cards in Problem, Requirements, Risks, and Tasks.
4. Choose and invite a Product Agent, Technical Architect, or UX Researcher.
5. Brainstorm in that specialist's thread and ask follow-up questions. Each specialist remembers its recent room conversation and sees the current eligible board cards.
6. Review any optional cards proposed by a specialist and approve or reject them.
7. Generate, preview, copy, or download the final Markdown plan.

Specialist replies do not have to modify the board. When an agent identifies a concrete contribution, it may add up to three reviewable proposals; only human cards plus approved AI proposals are eligible for the final artifact. Use **+ New room** in the workspace header to return to room creation.

## Local Kiro execution preview

The final-plan dialog can hand the approved Markdown plan to an authenticated Kiro CLI installation and show its progress in a read-only terminal-style log. This experimental feature is disabled by default. To enable it, install and authenticate `kiro-cli`, then add these values to `.env` and restart the app:

```env
ENABLE_KIRO_EXECUTION=true
KIRO_EXECUTION_ROOT=./generated
```

Open the app through `http://localhost:3000`; execution is rejected when the site is accessed through a LAN hostname. Each run receives a new ignored directory beneath `KIRO_EXECUTION_ROOT`. The server starts Kiro directly with fixed non-interactive arguments and trusts only its file-read, file-write, and shell tools. The UI can observe or stop the process but cannot submit terminal commands or choose a filesystem path.

> **Local execution warning:** This preview lets an AI coding agent create files and run commands on your machine. The generated working directory and fixed prompt are useful guardrails, but they are not an operating-system security sandbox. Do not enable this feature on a hosted server or expose it to untrusted users. Review generated code before running or publishing it.

## Built with Kiro

Launch Room was developed from a deliberately small, messy concept into a testable one-day MVP with Kiro’s spec-driven workflow. The Launch Room Spec first turned the idea into explicit requirements: anonymous room creation, two-browser collaboration, shared planning cards, an invited AI teammate, human review, and a useful final artifact. Its design document then mapped those requirements onto the Next.js routes, SQLite records, polling model, structured AI responses, and trust boundaries. The implementation task list kept the work ordered and made the finished scope auditable.

Project Steering files gave Kiro durable guidance beyond an individual prompt. Product steering protected the board-first workflow and demo scope; technical and structure steering constrained the local-first architecture and file organization; agent-behavior steering required compact shared context, grounded suggestions, trusted server metadata, and human approval before AI proposals could affect the final plan.

The repository also includes a post-task quality-gate Hook that runs TypeScript checking and a reusable demo-readiness Skill for auditing the complete collaboration journey. Together, these artifacts made Kiro more than a code generator: it acted as the project’s planning system, implementation guide, behavioral guardrail, and final readiness check.

The complete Kiro artifacts are tracked under [`.kiro`](./.kiro).

## Validation

```bash
pnpm run verify
```

This runs TypeScript checking, ESLint, and the production Next.js build.

> **Demo safety warning:** Anonymous room links and Client IDs are demo conveniences, not production authorization. This application is unsuitable for confidential data, production authorization, serverless deployment, or multiple app instances.
