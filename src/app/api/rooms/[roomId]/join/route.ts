import { NextResponse } from "next/server";

import { JoinRoomInputSchema } from "@/lib/contracts";
import { joinRoom } from "@/lib/db";
import { safeError } from "@/lib/safe-error";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ roomId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const input = JoinRoomInputSchema.safeParse(await request.json());
    if (!input.success) {
      return safeError(
        "INVALID_JOIN_INPUT",
        "Enter a nickname between 1 and 50 characters.",
        400,
      );
    }

    const { roomId } = await context.params;
    if (joinRoom({ roomId, ...input.data }) === "missing") {
      return safeError(
        "ROOM_NOT_FOUND",
        "This workspace does not exist.",
        404,
      );
    }

    return NextResponse.json({ joined: true });
  } catch {
    return safeError(
      "ROOM_JOIN_FAILED",
      "Workspace could not be joined. Try again.",
      500,
      true,
    );
  }
}
