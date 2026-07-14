import { NextResponse } from "next/server";

import { HumanCardInputSchema } from "@/lib/contracts";
import { updateHumanCard } from "@/lib/db";
import { safeError } from "@/lib/safe-error";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ roomId: string; cardId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const input = HumanCardInputSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!input.success) {
      return safeError(
        "INVALID_CARD_INPUT",
        "Check the card section, title, and content.",
        400,
      );
    }

    const { roomId, cardId } = await context.params;
    const result = updateHumanCard({ roomId, cardId, ...input.data });
    if (result.status === "room-missing") {
      return safeError("ROOM_NOT_FOUND", "This workspace does not exist.", 404);
    }
    if (result.status === "participant-missing") {
      return safeError(
        "PARTICIPANT_NOT_FOUND",
        "Join this workspace before editing cards.",
        403,
      );
    }
    if (result.status !== "updated") {
      return safeError(
        "CARD_NOT_EDITABLE",
        "This card is not available for human editing.",
        404,
      );
    }

    return NextResponse.json({ updated: true });
  } catch {
    return safeError(
      "CARD_UPDATE_FAILED",
      "Card could not be updated. Try again.",
      500,
      true,
    );
  }
}
