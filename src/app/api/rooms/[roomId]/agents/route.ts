import { NextResponse } from "next/server";

import { InviteProductAgentInputSchema } from "@/lib/agents/schema";
import { inviteProductAgent } from "@/lib/db";
import { safeError } from "@/lib/safe-error";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ roomId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const input = InviteProductAgentInputSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!input.success) {
      return safeError("INVALID_AGENT_INVITE", "Teammate could not be invited.", 400);
    }

    const { roomId } = await context.params;
    const result = inviteProductAgent({ roomId, ...input.data });
    if (result.status === "room-missing") {
      return safeError("ROOM_NOT_FOUND", "This workspace does not exist.", 404);
    }
    if (result.status !== "invited") {
      return safeError(
        "PARTICIPANT_NOT_FOUND",
        "Join this workspace before inviting a teammate.",
        403,
      );
    }

    return NextResponse.json({ participantId: result.participantId });
  } catch {
    return safeError(
      "AGENT_INVITE_FAILED",
      "Teammate could not be invited. Try again.",
      500,
      true,
    );
  }
}
