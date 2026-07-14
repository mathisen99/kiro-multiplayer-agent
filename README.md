# Launch Room

Launch Room is a local, one-day demo MVP for two nickname-only participants to shape a planning board with one invited Product Agent and export an approved Markdown plan.

## Quick start

Requirements: Node.js 24 and pnpm 11.

```bash
cp .env.example .env
pnpm install
pnpm run dev
```

Add your OpenAI API key to `.env` before running the Product Agent:

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
4. Select **Invite teammate** to add the Product Agent.
5. Give it one focused planning request and select **Run teammate**.
6. Review the proposed cards on the board and approve or reject them.
7. Generate, preview, copy, or download the final Markdown plan.

The Product Agent is deliberately not a chatbot. Each explicit run produces reviewable workspace cards, and only human cards plus approved AI proposals are eligible for the final artifact.

## Validation

```bash
pnpm run verify
```

This runs TypeScript checking, ESLint, and the production Next.js build.

> **Demo safety warning:** Anonymous room links and Client IDs are demo conveniences, not production authorization. This application is unsuitable for confidential data, production authorization, serverless deployment, or multiple app instances.
