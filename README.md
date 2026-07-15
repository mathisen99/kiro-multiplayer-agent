# Launch Room

Launch Room is a local demo workspace where nickname-only participants can shape a planning board, brainstorm with three AI specialists, review their proposed cards, and export an approved Markdown plan.

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

## Validation

```bash
pnpm run verify
```

This runs TypeScript checking, ESLint, and the production Next.js build.

> **Demo safety warning:** Anonymous room links and Client IDs are demo conveniences, not production authorization. This application is unsuitable for confidential data, production authorization, serverless deployment, or multiple app instances.
