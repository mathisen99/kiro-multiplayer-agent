import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import Database from "better-sqlite3";
import { z } from "zod";

import type { AgentRole } from "@/lib/contracts";

const sourceCardIdsSchema = z.array(z.string().uuid()).max(4);

export type RoomRow = {
  id: string;
  name: string;
  goal: string;
  rough_idea: string;
  final_title: string | null;
  final_markdown: string | null;
  created_at: string;
  updated_at: string;
};

export type ParticipantRow = {
  id: string;
  room_id: string;
  client_id: string | null;
  participant_type: "human" | "agent";
  display_name: string;
  agent_role: "product" | "critic" | "engineer" | "ux" | "growth" | null;
  created_at: string;
  last_seen_at: string;
};

export type CardRow = {
  id: string;
  room_id: string;
  section: "problem" | "requirements" | "risks" | "tasks";
  title: string;
  content: string;
  status: "active" | "proposed" | "approved" | "rejected";
  author_type: "human" | "agent";
  author_name: string;
  agent_role: "product" | "critic" | "engineer" | "ux" | "growth" | null;
  rationale: string | null;
  source_card_ids_json: string;
  created_at: string;
  updated_at: string;
};

export type MappedCardRow = Omit<CardRow, "source_card_ids_json"> & {
  sourceCardIds: string[];
};

export type AgentConversationRow = {
  id: string;
  participant_id: string;
  agent_role: AgentRole;
  agent_name: string;
  instruction: string;
  response: string;
  created_at: string;
  proposal_count: number;
};

type DatabaseGlobal = typeof globalThis & {
  launchRoomDatabase?: Database.Database;
};

const databaseGlobal = globalThis as DatabaseGlobal;
const databasePath = resolve(
  process.cwd(),
  process.env.DATABASE_PATH ?? "./data/launch-room.db",
);
mkdirSync(dirname(databasePath), { recursive: true });

const database =
  databaseGlobal.launchRoomDatabase ?? new Database(databasePath);
databaseGlobal.launchRoomDatabase = database;

database.pragma("journal_mode = WAL");
database.pragma("foreign_keys = ON");
database.pragma("busy_timeout = 5000");
database.exec(
  readFileSync(resolve(process.cwd(), "db/schema.sql"), "utf8"),
);

const roomByIdStatement = database.prepare(
  `select id, name, goal, rough_idea, final_title, final_markdown,
          created_at, updated_at
     from rooms
    where id = ?`,
);
const participantsByRoomStatement = database.prepare(
  `select id, room_id, client_id, participant_type, display_name, agent_role,
          created_at, last_seen_at
     from participants
    where room_id = ?
    order by created_at asc, id asc`,
);
const visibleCardsByRoomStatement = database.prepare(
  `select id, room_id, section, title, content, status, author_type,
          author_name, agent_role, rationale, source_card_ids_json,
          created_at, updated_at
     from cards
    where room_id = ? and status <> 'rejected'`,
);
const conversationsByRoomStatement = database.prepare(
  `select runs.id, runs.participant_id, participants.agent_role,
          participants.display_name as agent_name, runs.instruction,
          runs.summary as response, runs.created_at,
          (select count(*) from cards where cards.room_id = runs.room_id
            and cards.author_type = 'agent'
            and cards.created_at = runs.completed_at
            and cards.author_name = participants.display_name) as proposal_count
     from agent_runs as runs
     join participants on participants.id = runs.participant_id
    where runs.room_id = ? and runs.status = 'completed'
      and runs.summary is not null and participants.agent_role is not null
    order by runs.created_at asc, runs.id asc`,
);
const insertRoomStatement = database.prepare(
  `insert into rooms
     (id, name, goal, rough_idea, created_at, updated_at)
   values (?, ?, ?, ?, ?, ?)`,
);
const insertHumanParticipantStatement = database.prepare(
  `insert into participants
     (id, room_id, client_id, participant_type, display_name, agent_role,
      created_at, last_seen_at)
   values (?, ?, ?, 'human', ?, null, ?, ?)`,
);
const insertInitialHumanCardStatement = database.prepare(
  `insert into cards
     (id, room_id, section, title, content, status, author_type, author_name,
      agent_role, rationale, source_card_ids_json, created_at, updated_at)
   values (?, ?, 'problem', ?, ?, 'active', 'human', ?, null, null, '[]', ?, ?)`,
);
const insertHumanCardStatement = database.prepare(
  `insert into cards
     (id, room_id, section, title, content, status, author_type, author_name,
      agent_role, rationale, source_card_ids_json, created_at, updated_at)
   values (?, ?, ?, ?, ?, 'active', 'human', ?, null, null, '[]', ?, ?)`,
);
const updateHumanCardStatement = database.prepare(
  `update cards
      set section = ?, title = ?, content = ?, updated_at = ?
    where id = ? and room_id = ? and author_type = 'human' and status = 'active'`,
);
const humanMembershipStatement = database.prepare(
  `select id, display_name
     from participants
    where room_id = ? and client_id = ? and participant_type = 'human'`,
);
const updateHumanMembershipStatement = database.prepare(
  `update participants
      set display_name = ?, last_seen_at = ?
    where room_id = ? and client_id = ? and participant_type = 'human'`,
);
const reviewProposedAgentCardStatement = database.prepare(
  `update cards
      set status = ?, updated_at = ?
    where id = ? and room_id = ? and author_type = 'agent' and status = 'proposed'`,
);

export function getDatabase(): Database.Database {
  return database;
}

export function createPersistedId(): string {
  return randomUUID();
}

export function createPersistedTimestamp(): string {
  return new Date().toISOString();
}

export function serializeSourceCardIds(sourceCardIds: readonly string[]): string {
  return JSON.stringify(sourceCardIdsSchema.parse(sourceCardIds));
}

export function parseSourceCardIds(value: string): string[] {
  try {
    return sourceCardIdsSchema.parse(JSON.parse(value));
  } catch {
    return [];
  }
}

export function mapCardRow(row: CardRow): MappedCardRow {
  const { source_card_ids_json: sourceIdsJson, ...card } = row;
  return { ...card, sourceCardIds: parseSourceCardIds(sourceIdsJson) };
}

export function createRoomWithCreator(input: {
  clientId: string;
  name: string;
  goal: string;
  roughIdea: string;
  nickname: string;
}): string {
  return database.transaction(() => {
    const roomId = createPersistedId();
    const participantId = createPersistedId();
    const cardId = createPersistedId();
    const timestamp = createPersistedTimestamp();

    insertRoomStatement.run(
      roomId,
      input.name,
      input.goal,
      input.roughIdea,
      timestamp,
      timestamp,
    );
    insertHumanParticipantStatement.run(
      participantId,
      roomId,
      input.clientId,
      input.nickname,
      timestamp,
      timestamp,
    );
    insertInitialHumanCardStatement.run(
      cardId,
      roomId,
      "Rough idea",
      input.roughIdea,
      input.nickname,
      timestamp,
      timestamp,
    );

    return roomId;
  })();
}

export function joinRoom(input: {
  roomId: string;
  clientId: string;
  nickname: string;
}): "joined" | "missing" {
  return database.transaction(() => {
    const room = roomByIdStatement.get(input.roomId) as RoomRow | undefined;
    if (!room) {
      return "missing";
    }

    const timestamp = createPersistedTimestamp();
    const membership = humanMembershipStatement.get(
      input.roomId,
      input.clientId,
    ) as { id: string } | undefined;

    if (membership) {
      updateHumanMembershipStatement.run(
        input.nickname,
        timestamp,
        input.roomId,
        input.clientId,
      );
    } else {
      insertHumanParticipantStatement.run(
        createPersistedId(),
        input.roomId,
        input.clientId,
        input.nickname,
        timestamp,
        timestamp,
      );
    }

    return "joined";
  })();
}

export type HumanCardMutationResult =
  | { status: "created"; cardId: string }
  | { status: "updated" }
  | { status: "room-missing" | "participant-missing" | "card-missing" };

export function createHumanCard(input: {
  roomId: string;
  clientId: string;
  section: "problem" | "requirements" | "risks" | "tasks";
  title: string;
  content: string;
}): HumanCardMutationResult {
  return database.transaction((): HumanCardMutationResult => {
    const room = roomByIdStatement.get(input.roomId) as RoomRow | undefined;
    if (!room) return { status: "room-missing" };

    const participant = humanMembershipStatement.get(
      input.roomId,
      input.clientId,
    ) as { id: string; display_name: string } | undefined;
    if (!participant) return { status: "participant-missing" };

    const cardId = createPersistedId();
    const timestamp = createPersistedTimestamp();
    insertHumanCardStatement.run(
      cardId,
      input.roomId,
      input.section,
      input.title,
      input.content,
      participant.display_name,
      timestamp,
      timestamp,
    );
    return { status: "created", cardId };
  })();
}

export function updateHumanCard(input: {
  roomId: string;
  cardId: string;
  clientId: string;
  section: "problem" | "requirements" | "risks" | "tasks";
  title: string;
  content: string;
}): HumanCardMutationResult {
  return database.transaction((): HumanCardMutationResult => {
    const room = roomByIdStatement.get(input.roomId) as RoomRow | undefined;
    if (!room) return { status: "room-missing" };

    const participant = humanMembershipStatement.get(
      input.roomId,
      input.clientId,
    ) as { id: string } | undefined;
    if (!participant) return { status: "participant-missing" };

    const result = updateHumanCardStatement.run(
      input.section,
      input.title,
      input.content,
      createPersistedTimestamp(),
      input.cardId,
      input.roomId,
    );
    return result.changes === 1
      ? { status: "updated" }
      : { status: "card-missing" };
  })();
}

export type ReviewProposalResult =
  | { status: "approved" | "rejected" }
  | { status: "room-missing" | "participant-missing" | "card-not-proposed" };

export function reviewProposal(input: {
  roomId: string;
  cardId: string;
  clientId: string;
  action: "approve" | "reject";
}): ReviewProposalResult {
  return database.transaction((): ReviewProposalResult => {
    const room = roomByIdStatement.get(input.roomId) as RoomRow | undefined;
    if (!room) return { status: "room-missing" };

    const participant = humanMembershipStatement.get(
      input.roomId,
      input.clientId,
    ) as { id: string } | undefined;
    if (!participant) return { status: "participant-missing" };

    const nextStatus = input.action === "approve" ? "approved" : "rejected";
    const result = reviewProposedAgentCardStatement.run(
      nextStatus,
      createPersistedTimestamp(),
      input.cardId,
      input.roomId,
    );
    return result.changes === 1
      ? { status: nextStatus }
      : { status: "card-not-proposed" };
  })();
}

export function readRoomRows(roomId: string): {
  room: RoomRow | undefined;
  participants: ParticipantRow[];
  cards: MappedCardRow[];
  conversations: AgentConversationRow[];
} {
  return database.transaction(() => {
    const room = roomByIdStatement.get(roomId) as RoomRow | undefined;
    if (!room) {
      return { room: undefined, participants: [], cards: [], conversations: [] };
    }

    const participants = participantsByRoomStatement.all(
      roomId,
    ) as ParticipantRow[];
    const cards = (visibleCardsByRoomStatement.all(roomId) as CardRow[]).map(
      mapCardRow,
    );
    const conversations = conversationsByRoomStatement.all(
      roomId,
    ) as AgentConversationRow[];
    return { room, participants, cards, conversations };
  })();
}

export function inTransaction<Result>(work: () => Result): Result {
  return database.transaction(work)();
}

const agentByRoomAndRoleStatement = database.prepare(
  `select id, room_id, client_id, participant_type, display_name, agent_role,
          created_at, last_seen_at
     from participants
    where room_id = ? and participant_type = 'agent' and agent_role = ?
    order by created_at asc, id asc
    limit 1`,
);
const insertAgentStatement = database.prepare(
  `insert into participants
     (id, room_id, client_id, participant_type, display_name, agent_role,
      created_at, last_seen_at)
   values (?, ?, null, 'agent', ?, ?, ?, ?)`,
);
const eligibleAgentCardsStatement = database.prepare(
  `select id, section, title, content
     from cards
    where room_id = ?
      and ((author_type = 'human' and status = 'active')
        or (author_type = 'agent' and status = 'approved'))
    order by created_at asc, id asc`,
);
const insertAgentRunStatement = database.prepare(
  `insert into agent_runs
     (id, room_id, participant_id, instruction, status, summary,
      error_message, created_at, completed_at)
   values (?, ?, ?, ?, 'running', null, null, ?, null)`,
);
const runningAgentRunStatement = database.prepare(
  `select id
     from agent_runs
    where id = ? and room_id = ? and participant_id = ? and status = 'running'`,
);
const insertAgentProposalStatement = database.prepare(
  `insert into cards
     (id, room_id, section, title, content, status, author_type, author_name,
      agent_role, rationale, source_card_ids_json, created_at, updated_at)
   values (?, ?, ?, ?, ?, 'proposed', 'agent', ?, ?, ?, ?, ?, ?)`,
);
const completeAgentRunStatement = database.prepare(
  `update agent_runs
      set status = 'completed', summary = ?, error_message = null, completed_at = ?
    where id = ? and room_id = ? and participant_id = ? and status = 'running'`,
);
const failAgentRunStatement = database.prepare(
  `update agent_runs
      set status = 'failed', error_message = ?, completed_at = ?
    where id = ? and status = 'running'`,
);
const replaceFinalArtifactStatement = database.prepare(
  `update rooms
      set final_title = ?, final_markdown = ?, updated_at = ?
    where id = ?`,
);

export type AgentContextCard = {
  id: string;
  section: "problem" | "requirements" | "risks" | "tasks";
  title: string;
  content: string;
};

export type InviteAgentResult =
  | { status: "invited"; participantId: string }
  | { status: "room-missing" | "participant-missing" };

const agentNames: Record<AgentRole, string> = {
  product: "Product Agent",
  engineer: "Technical Architect",
  ux: "UX Researcher",
};

export function inviteAgent(input: {
  roomId: string;
  clientId: string;
  role: AgentRole;
}): InviteAgentResult {
  return database.transaction((): InviteAgentResult => {
    const room = roomByIdStatement.get(input.roomId) as RoomRow | undefined;
    if (!room) return { status: "room-missing" };

    const human = humanMembershipStatement.get(input.roomId, input.clientId) as
      | { id: string }
      | undefined;
    if (!human) return { status: "participant-missing" };

    const existing = agentByRoomAndRoleStatement.get(input.roomId, input.role) as
      | ParticipantRow
      | undefined;
    if (existing) return { status: "invited", participantId: existing.id };

    const participantId = createPersistedId();
    const timestamp = createPersistedTimestamp();
    insertAgentStatement.run(
      participantId,
      input.roomId,
      agentNames[input.role],
      input.role,
      timestamp,
      timestamp,
    );
    return { status: "invited", participantId };
  })();
}

export type PreparedAgentRun = {
  status: "ready";
  runId: string;
  roomName: string;
  roomGoal: string;
  agentName: string;
  agentRole: AgentRole;
  cards: AgentContextCard[];
  conversation: Array<{ instruction: string; response: string }>;
};

export type PrepareAgentRunResult =
  | PreparedAgentRun
  | {
      status:
        | "room-missing"
        | "participant-missing"
        | "agent-missing";
    };

export function prepareAgentRun(input: {
  roomId: string;
  participantId: string;
  clientId: string;
  instruction: string;
}): PrepareAgentRunResult {
  return database.transaction((): PrepareAgentRunResult => {
    const room = roomByIdStatement.get(input.roomId) as RoomRow | undefined;
    if (!room) return { status: "room-missing" };

    const human = humanMembershipStatement.get(input.roomId, input.clientId) as
      | { id: string }
      | undefined;
    if (!human) return { status: "participant-missing" };

    const agent = database.prepare(
      `select id, room_id, client_id, participant_type, display_name, agent_role,
              created_at, last_seen_at
         from participants
        where id = ? and room_id = ? and participant_type = 'agent'`,
    ).get(input.participantId, input.roomId) as ParticipantRow | undefined;
    if (!agent || !agent.agent_role || !["product", "engineer", "ux"].includes(agent.agent_role)) {
      return { status: "agent-missing" };
    }

    const runId = createPersistedId();
    insertAgentRunStatement.run(
      runId,
      input.roomId,
      agent.id,
      input.instruction,
      createPersistedTimestamp(),
    );

    const cards = eligibleAgentCardsStatement.all(input.roomId) as AgentContextCard[];
    const conversation = database.prepare(
      `select instruction, summary as response
         from agent_runs
        where room_id = ? and participant_id = ? and status = 'completed'
          and summary is not null
        order by created_at desc, id desc
        limit 6`,
    ).all(input.roomId, agent.id) as Array<{ instruction: string; response: string }>;
    return {
      status: "ready",
      runId,
      roomName: room.name,
      roomGoal: room.goal,
      agentName: agent.display_name,
      agentRole: agent.agent_role as AgentRole,
      cards,
      conversation: conversation.reverse(),
    };
  })();
}

export type TrustedAgentProposal = {
  section: "problem" | "requirements" | "risks" | "tasks";
  title: string;
  content: string;
  rationale: string;
  sourceCardIds: string[];
};

export function completeAgentRun(input: {
  runId: string;
  roomId: string;
  participantId: string;
  agentName: string;
  agentRole: AgentRole;
  summary: string;
  proposals: readonly TrustedAgentProposal[];
}): boolean {
  return database.transaction(() => {
    const running = runningAgentRunStatement.get(
      input.runId,
      input.roomId,
      input.participantId,
    ) as { id: string } | undefined;
    if (!running) return false;

    const timestamp = createPersistedTimestamp();
    for (const proposal of input.proposals) {
      insertAgentProposalStatement.run(
        createPersistedId(),
        input.roomId,
        proposal.section,
        proposal.title,
        proposal.content,
        input.agentName,
        input.agentRole,
        proposal.rationale,
        serializeSourceCardIds(proposal.sourceCardIds),
        timestamp,
        timestamp,
      );
    }

    const completed = completeAgentRunStatement.run(
      input.summary,
      timestamp,
      input.runId,
      input.roomId,
      input.participantId,
    );
    if (completed.changes !== 1) throw new Error("Agent run state changed");
    return true;
  })();
}

export function failAgentRun(runId: string): void {
  database.transaction(() => {
    failAgentRunStatement.run(
      "Teammate could not complete this run",
      createPersistedTimestamp(),
      runId,
    );
  })();
}

export type PrepareFinalizationResult =
  | {
      status: "ready";
      roomName: string;
      roomGoal: string;
      cards: AgentContextCard[];
    }
  | { status: "room-missing" | "participant-missing" };

export function prepareFinalization(input: {
  roomId: string;
  clientId: string;
}): PrepareFinalizationResult {
  return database.transaction((): PrepareFinalizationResult => {
    const room = roomByIdStatement.get(input.roomId) as RoomRow | undefined;
    if (!room) return { status: "room-missing" };

    const human = humanMembershipStatement.get(input.roomId, input.clientId) as
      | { id: string }
      | undefined;
    if (!human) return { status: "participant-missing" };

    return {
      status: "ready",
      roomName: room.name,
      roomGoal: room.goal,
      cards: eligibleAgentCardsStatement.all(input.roomId) as AgentContextCard[],
    };
  })();
}

export function replaceFinalArtifact(input: {
  roomId: string;
  title: string;
  markdown: string;
}): boolean {
  return database.transaction(() => {
    const result = replaceFinalArtifactStatement.run(
      input.title,
      input.markdown,
      createPersistedTimestamp(),
      input.roomId,
    );
    return result.changes === 1;
  })();
}

export type PrepareKiroExecutionResult =
  | { status: "ready"; roomName: string; title: string; markdown: string }
  | { status: "room-missing" | "participant-missing" | "artifact-missing" };

export function prepareKiroExecution(input: {
  roomId: string;
  clientId: string;
}): PrepareKiroExecutionResult {
  return database.transaction((): PrepareKiroExecutionResult => {
    const room = roomByIdStatement.get(input.roomId) as RoomRow | undefined;
    if (!room) return { status: "room-missing" };

    const human = humanMembershipStatement.get(input.roomId, input.clientId) as
      | { id: string }
      | undefined;
    if (!human) return { status: "participant-missing" };
    if (room.final_title === null || room.final_markdown === null) {
      return { status: "artifact-missing" };
    }

    return {
      status: "ready",
      roomName: room.name,
      title: room.final_title,
      markdown: room.final_markdown,
    };
  })();
}
