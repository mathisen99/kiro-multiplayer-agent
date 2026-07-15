import "server-only";

import { zodTextFormat } from "openai/helpers/zod";

import { AgentRunOutputSchema } from "@/lib/agents/schema";
import { agentPrompt } from "@/lib/agents/prompts";
import {
  completeAgentRun,
  failAgentRun,
  prepareAgentRun,
} from "@/lib/db";
import { getOpenAI } from "@/lib/openai";

export type RunAgentResult =
  | { status: "completed"; runId: string; response: string; proposalCount: number }
  | {
      status:
        | "room-missing"
        | "participant-missing"
        | "agent-missing"
        | "failed";
      runId?: string;
    };

export async function runAgent(input: {
  roomId: string;
  participantId: string;
  clientId: string;
  instruction: string;
}): Promise<RunAgentResult> {
  const prepared = prepareAgentRun(input);
  if (prepared.status !== "ready") return prepared;

  try {
    const { client, model } = getOpenAI();
    const compactContext = JSON.stringify({
      room: { name: prepared.roomName, goal: prepared.roomGoal },
      role: prepared.agentName,
      instruction: input.instruction,
      eligibleCards: prepared.cards,
      recentConversation: prepared.conversation,
    });

    const response = await client.responses.parse({
      model,
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 2_000,
      input: [
        { role: "system", content: agentPrompt(prepared.agentRole) },
        { role: "user", content: compactContext },
      ],
      text: {
        format: zodTextFormat(AgentRunOutputSchema, "agent_run_output"),
      },
    });

    const output = AgentRunOutputSchema.parse(response.output_parsed);
    const eligibleIds = new Set(prepared.cards.map((card) => card.id));
    const proposals = output.proposals.map((proposal) => ({
      ...proposal,
      sourceCardIds: proposal.sourceCardIds.filter((id) => eligibleIds.has(id)),
    }));

    const completed = completeAgentRun({
      runId: prepared.runId,
      roomId: input.roomId,
      participantId: input.participantId,
      agentName: prepared.agentName,
      agentRole: prepared.agentRole,
      summary: output.response,
      proposals,
    });
    if (!completed) throw new Error("Agent run could not be completed");

    return {
      status: "completed",
      runId: prepared.runId,
      response: output.response,
      proposalCount: proposals.length,
    };
  } catch {
    try {
      failAgentRun(prepared.runId);
    } catch {
      // The original failure remains safe; no cards were changed by this handler.
    }
    return { status: "failed", runId: prepared.runId };
  }
}
