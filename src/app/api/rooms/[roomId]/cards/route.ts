import { NextResponse } from "next/server";

import { HumanCardInputSchema } from "@/lib/contracts";
import { createHumanCard } from "@/lib/db";
import { safeError } from "@/lib/safe-error";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ roomId: string }> };

export async function POST(request: Request, context: RouteContext) {
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

    const { roomId } = await context.params;
    const result = createHumanCard({ roomId, ...input.data });
    if (result.status === "room-missing") {
      return safeError("ROOM_NOT_FOUND", "This workspace does not exist.", 404);
    }
    if (result.status === "participant-missing") {
      return safeError(
        "PARTICIPANT_NOT_FOUND",
        "Join this workspace before adding cards.",
        403,
      );
    }
    if (result.status !== "created") {
      return safeError("CARD_CREATE_FAILED", "Card could not be created.", 500, true);
    }

    return NextResponse.json({ cardId: result.cardId }, { status: 201 });
  } catch {
    return safeError(
      "CARD_CREATE_FAILED",
      "Card could not be created. Try again.",
      500,
      true,
    );
  }
}
