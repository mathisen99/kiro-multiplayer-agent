import { NextResponse } from "next/server";

import { CreateRoomInputSchema } from "@/lib/contracts";
import { createRoomWithCreator } from "@/lib/db";
import { safeError } from "@/lib/safe-error";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = CreateRoomInputSchema.safeParse(await request.json());
    if (!input.success) {
      return safeError(
        "INVALID_ROOM_INPUT",
        "Check the workspace details and try again.",
        400,
      );
    }

    const roomId = createRoomWithCreator(input.data);
    return NextResponse.json({ roomId }, { status: 201 });
  } catch {
    return safeError(
      "ROOM_CREATE_FAILED",
      "Workspace could not be created. Try again.",
      500,
      true,
    );
  }
}
