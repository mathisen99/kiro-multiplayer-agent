import {
  RoomSnapshotSchema,
  sortRoomCards,
  type AgentRole,
  type RoomSnapshot,
} from "@/lib/contracts";
import { readRoomRows } from "@/lib/db";

const supportedAgentRoles = new Set(["product", "engineer", "ux"]);

function supportedAgentRole(role: string | null): AgentRole | null {
  return role !== null && supportedAgentRoles.has(role)
    ? (role as AgentRole)
    : null;
}

export function getRoomSnapshot(roomId: string): RoomSnapshot | null {
  const { room, participants, cards, conversations } = readRoomRows(roomId);
  if (!room) {
    return null;
  }

  return RoomSnapshotSchema.parse({
    room: {
      id: room.id,
      name: room.name,
      goal: room.goal,
    },
    participants: participants.map((participant) => ({
      id: participant.id,
      type: participant.participant_type,
      displayName: participant.display_name,
      agentRole:
        participant.participant_type === "agent"
          ? supportedAgentRole(participant.agent_role)
          : null,
    })),
    cards: sortRoomCards(
      cards.map((card) => ({
        id: card.id,
        section: card.section,
        title: card.title,
        content: card.content,
        status: card.status,
        authorType: card.author_type,
        authorName: card.author_name,
        agentRole:
          card.author_type === "agent"
            ? supportedAgentRole(card.agent_role)
            : null,
        rationale: card.rationale,
        sourceCardIds: card.sourceCardIds,
        createdAt: card.created_at,
        updatedAt: card.updated_at,
      })),
    ),
    conversations: conversations.map((turn) => ({
      id: turn.id,
      participantId: turn.participant_id,
      agentRole: turn.agent_role,
      agentName: turn.agent_name,
      instruction: turn.instruction,
      response: turn.response,
      proposalCount: turn.proposal_count,
      createdAt: turn.created_at,
    })),
    finalArtifact:
      room.final_title !== null && room.final_markdown !== null
        ? { title: room.final_title, markdown: room.final_markdown }
        : null,
  });
}
