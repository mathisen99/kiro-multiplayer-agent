import "server-only";

import { z } from "zod";

import { AgentRoleSchema, CardSectionSchema, ClientIdSchema } from "@/lib/contracts";

const trimmedText = (maximum: number) => z.string().trim().min(1).max(maximum);

export const InviteAgentInputSchema = z
  .object({ clientId: ClientIdSchema, role: AgentRoleSchema })
  .strict();

export const RunAgentInputSchema = z
  .object({
    clientId: ClientIdSchema,
    instruction: trimmedText(600),
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
    response: trimmedText(1_600),
    proposals: z.array(AgentProposalSchema).max(3),
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
