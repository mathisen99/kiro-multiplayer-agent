import { NextResponse } from "next/server";

import { runProductAgent } from "@/lib/agents/run-agent";
import { RunProductAgentInputSchema } from "@/lib/agents/schema";
import { safeError } from "@/lib/safe-error";

export const runtime = "nodejs";

const failureMessage = "Teammate could not complete this run";
type RouteContext = {
  params: Promise<{ roomId: string; participantId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const input = RunProductAgentInputSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!input.success) {
      return safeError("INVALID_AGENT_RUN", failureMessage, 400, true);
    }

    const { roomId, participantId } = await context.params;
    const result = await runProductAgent({
      roomId,
      participantId,
      ...input.data,
    });

    if (result.status === "room-missing") {
      return safeError("ROOM_NOT_FOUND", "This workspace does not exist.", 404);
    }
    if (result.status === "participant-missing") {
      return safeError("PARTICIPANT_NOT_FOUND", failureMessage, 403, true);
    }
    if (result.status === "agent-missing") {
      return safeError("AGENT_NOT_FOUND", failureMessage, 404, true);
    }
    if (result.status === "failed") {
      return safeError("AGENT_RUN_FAILED", failureMessage, 502, true);
    }

    return NextResponse.json({ runId: result.runId, status: "completed" });
  } catch {
    return safeError("AGENT_RUN_FAILED", failureMessage, 500, true);
  }
}
