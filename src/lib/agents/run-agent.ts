import "server-only";

import { zodTextFormat } from "openai/helpers/zod";

import { AgentRunOutputSchema } from "@/lib/agents/schema";
import { productAgentPrompt } from "@/lib/agents/prompts";
import {
  completeAgentRun,
  failAgentRun,
  prepareAgentRun,
} from "@/lib/db";
import { getOpenAI } from "@/lib/openai";

export type RunProductAgentResult =
  | { status: "completed"; runId: string }
  | {
      status:
        | "room-missing"
        | "participant-missing"
        | "agent-missing"
        | "failed";
      runId?: string;
    };

export async function runProductAgent(input: {
  roomId: string;
  participantId: string;
  clientId: string;
  instruction: string;
}): Promise<RunProductAgentResult> {
  const prepared = prepareAgentRun(input);
  if (prepared.status !== "ready") return prepared;

  try {
    const { client, model } = getOpenAI();
    const compactContext = JSON.stringify({
      room: { name: prepared.roomName, goal: prepared.roomGoal },
      role: "Product Agent",
      instruction: input.instruction,
      eligibleCards: prepared.cards,
    });

    const response = await client.responses.parse({
      model,
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 2_000,
      input: [
        { role: "system", content: productAgentPrompt },
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
      summary: output.summary,
      proposals,
    });
    if (!completed) throw new Error("Agent run could not be completed");

    return { status: "completed", runId: prepared.runId };
  } catch {
    try {
      failAgentRun(prepared.runId);
    } catch {
      // The original failure remains safe; no cards were changed by this handler.
    }
    return { status: "failed", runId: prepared.runId };
  }
}
