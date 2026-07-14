import {
  RoomSnapshotSchema,
  sortRoomCards,
  type RoomSnapshot,
} from "@/lib/contracts";
import { readRoomRows } from "@/lib/db";

export function getRoomSnapshot(roomId: string): RoomSnapshot | null {
  const { room, participants, cards } = readRoomRows(roomId);
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
        participant.participant_type === "agent" &&
        participant.agent_role === "product"
          ? "product"
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
          card.author_type === "agent" && card.agent_role === "product"
            ? "product"
            : null,
        rationale: card.rationale,
        sourceCardIds: card.sourceCardIds,
        createdAt: card.created_at,
        updatedAt: card.updated_at,
      })),
    ),
    finalArtifact:
      room.final_title !== null && room.final_markdown !== null
        ? { title: room.final_title, markdown: room.final_markdown }
        : null,
  });
}
