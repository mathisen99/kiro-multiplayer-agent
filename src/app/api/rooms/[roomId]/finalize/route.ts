import { NextResponse } from "next/server";

import { finalizeRoom } from "@/lib/agents/finalize-room";
import { FinalizeRoomInputSchema } from "@/lib/agents/schema";
import { safeError } from "@/lib/safe-error";

export const runtime = "nodejs";

const failureMessage = "Final artifact could not be generated. Try again.";
type RouteContext = { params: Promise<{ roomId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const input = FinalizeRoomInputSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!input.success) {
      return safeError("INVALID_FINALIZATION", failureMessage, 400, true);
    }

    const { roomId } = await context.params;
    const result = await finalizeRoom({ roomId, ...input.data });
    if (result.status === "room-missing") {
      return safeError("ROOM_NOT_FOUND", "This workspace does not exist.", 404, true);
    }
    if (result.status === "participant-missing") {
      return safeError("PARTICIPANT_NOT_FOUND", failureMessage, 403, true);
    }
    if (result.status === "failed") {
      return safeError("FINALIZATION_FAILED", failureMessage, 502, true);
    }

    return NextResponse.json({ artifact: result.artifact });
  } catch {
    return safeError("FINALIZATION_FAILED", failureMessage, 500, true);
  }
}
