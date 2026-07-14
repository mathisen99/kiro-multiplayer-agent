import "server-only";

import { zodTextFormat } from "openai/helpers/zod";

import { finalArtifactPrompt } from "@/lib/agents/prompts";
import { FinalArtifactOutputSchema } from "@/lib/agents/schema";
import { prepareFinalization, replaceFinalArtifact } from "@/lib/db";
import { getOpenAI } from "@/lib/openai";

const requiredHeadings = [
  "# Title",
  "## Summary",
  "## Problem",
  "## Target user",
  "## Goals",
  "## Non-goals",
  "## Requirements",
  "## Acceptance criteria",
  "## Risks and open questions",
  "## Implementation plan",
  "## Demo checklist",
] as const;

export type FinalizeRoomResult =
  | { status: "completed"; artifact: { title: string; markdown: string } }
  | { status: "room-missing" }
  | { status: "participant-missing" }
  | { status: "failed" };

function hasRequiredHeadings(markdown: string): boolean {
  const headings = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^#{1,2}\s/.test(line));

  let previousIndex = -1;
  for (const required of requiredHeadings) {
    const indexes = headings.flatMap((heading, index) =>
      heading === required ? [index] : [],
    );
    if (indexes.length !== 1 || indexes[0] <= previousIndex) return false;
    previousIndex = indexes[0];
  }
  return true;
}

export async function finalizeRoom(input: {
  roomId: string;
  clientId: string;
}): Promise<FinalizeRoomResult> {
  const prepared = prepareFinalization(input);
  if (prepared.status !== "ready") return prepared;

  try {
    const { client, model } = getOpenAI();
    const compactContext = JSON.stringify({
      room: { name: prepared.roomName, goal: prepared.roomGoal },
      eligibleCards: prepared.cards.map(({ section, title, content }) => ({
        section,
        title,
        content,
      })),
    });

    const response = await client.responses.parse({
      model,
      store: false,
      reasoning: { effort: "medium" },
      max_output_tokens: 8_000,
      input: [
        { role: "system", content: finalArtifactPrompt },
        { role: "user", content: compactContext },
      ],
      text: {
        format: zodTextFormat(FinalArtifactOutputSchema, "final_artifact"),
      },
    });

    const artifact = FinalArtifactOutputSchema.parse(response.output_parsed);
    if (!hasRequiredHeadings(artifact.markdown)) {
      return { status: "failed" };
    }
    if (!replaceFinalArtifact({ roomId: input.roomId, ...artifact })) {
      return { status: "failed" };
    }

    return { status: "completed", artifact };
  } catch {
    return { status: "failed" };
  }
}
