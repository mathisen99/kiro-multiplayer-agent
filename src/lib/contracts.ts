import { z } from "zod";

const trimmedText = (maximum: number) => z.string().trim().min(1).max(maximum);

export const ClientIdSchema = z.string().uuid();
export const CardSectionSchema = z.enum([
  "problem",
  "requirements",
  "risks",
  "tasks",
]);
export const CardStatusSchema = z.enum([
  "active",
  "proposed",
  "approved",
  "rejected",
]);
export const ParticipantTypeSchema = z.enum(["human", "agent"]);
export const AgentRoleSchema = z.literal("product");

export const CreateRoomInputSchema = z.object({
  clientId: ClientIdSchema,
  name: trimmedText(100),
  goal: z.string().trim().max(500),
  roughIdea: trimmedText(900),
  nickname: trimmedText(50),
});

export const JoinRoomInputSchema = z.object({
  clientId: ClientIdSchema,
  nickname: trimmedText(50),
});

export const HumanCardInputSchema = z.object({
  clientId: ClientIdSchema,
  section: CardSectionSchema,
  title: trimmedText(100),
  content: trimmedText(900),
});

export const ReviewProposalInputSchema = z
  .object({
    clientId: ClientIdSchema,
    action: z.enum(["approve", "reject"]),
  })
  .strict();

export const ParticipantSchema = z
  .object({
    id: z.string().uuid(),
    type: ParticipantTypeSchema,
    displayName: trimmedText(100),
    agentRole: AgentRoleSchema.nullable(),
  })
  .strict();

export const RoomCardSchema = z
  .object({
    id: z.string().uuid(),
    section: CardSectionSchema,
    title: trimmedText(100),
    content: trimmedText(900),
    status: CardStatusSchema,
    authorType: ParticipantTypeSchema,
    authorName: trimmedText(100),
    agentRole: AgentRoleSchema.nullable(),
    rationale: z.string().min(1).max(300).nullable(),
    sourceCardIds: z.array(z.string().uuid()).max(4),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const FinalArtifactSchema = z
  .object({
    title: trimmedText(120),
    markdown: z.string().min(100).max(10_000),
  })
  .strict();

export const RoomSnapshotSchema = z
  .object({
    room: z
      .object({
        id: z.string().uuid(),
        name: trimmedText(100),
        goal: z.string().max(500),
      })
      .strict(),
    participants: z.array(ParticipantSchema),
    cards: z.array(RoomCardSchema),
    finalArtifact: FinalArtifactSchema.nullable(),
  })
  .strict();

export const SafeErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.string().min(1).max(50),
        message: z.string().min(1).max(200),
        retryable: z.boolean(),
      })
      .strict(),
  })
  .strict();

export type CardSection = z.infer<typeof CardSectionSchema>;
export type CardStatus = z.infer<typeof CardStatusSchema>;
export type ParticipantType = z.infer<typeof ParticipantTypeSchema>;
export type AgentRole = z.infer<typeof AgentRoleSchema>;
export type CreateRoomInput = z.infer<typeof CreateRoomInputSchema>;
export type JoinRoomInput = z.infer<typeof JoinRoomInputSchema>;
export type HumanCardInput = z.infer<typeof HumanCardInputSchema>;
export type Participant = z.infer<typeof ParticipantSchema>;
export type RoomCard = z.infer<typeof RoomCardSchema>;
export type FinalArtifact = z.infer<typeof FinalArtifactSchema>;
export type RoomSnapshot = z.infer<typeof RoomSnapshotSchema>;
export type SafeErrorResponse = z.infer<typeof SafeErrorResponseSchema>;

const sectionRank: Record<CardSection, number> = {
  problem: 0,
  requirements: 1,
  risks: 2,
  tasks: 3,
};

export function compareRoomCards(left: RoomCard, right: RoomCard): number {
  return (
    sectionRank[left.section] - sectionRank[right.section] ||
    left.createdAt.localeCompare(right.createdAt) ||
    left.id.localeCompare(right.id)
  );
}

export function sortRoomCards(cards: readonly RoomCard[]): RoomCard[] {
  return [...cards].sort(compareRoomCards);
}
