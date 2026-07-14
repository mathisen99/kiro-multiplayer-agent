import "server-only";

import { z } from "zod";

import { CardSectionSchema, ClientIdSchema } from "@/lib/contracts";

const trimmedText = (maximum: number) => z.string().trim().min(1).max(maximum);

export const InviteProductAgentInputSchema = z
  .object({ clientId: ClientIdSchema })
  .strict();

export const RunProductAgentInputSchema = z
  .object({
    clientId: ClientIdSchema,
    instruction: trimmedText(300),
  })
  .strict();

export const AgentProposalSchema = z
  .object({
    section: CardSectionSchema,
    title: trimmedText(100),
    content: trimmedText(900),
    rationale: trimmedText(300),
    sourceCardIds: z.array(z.string().uuid()).max(4),
  })
  .strict();

export const AgentRunOutputSchema = z
  .object({
    summary: trimmedText(240),
    proposals: z.array(AgentProposalSchema).min(1).max(3),
  })
  .strict();

export const FinalizeRoomInputSchema = z
  .object({ clientId: ClientIdSchema })
  .strict();

export const FinalArtifactOutputSchema = z
  .object({
    title: trimmedText(120),
    markdown: z.string().min(100).max(10_000),
  })
  .strict();

export type AgentRunOutput = z.infer<typeof AgentRunOutputSchema>;
