import { NextResponse } from "next/server";

import { getRoomSnapshot } from "@/lib/room-snapshot";
import { safeError } from "@/lib/safe-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ roomId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { roomId } = await context.params;
    const snapshot = getRoomSnapshot(roomId);
    if (!snapshot) {
      return safeError(
        "ROOM_NOT_FOUND",
        "This workspace does not exist.",
        404,
      );
    }

    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return safeError(
      "ROOM_LOAD_FAILED",
      "Workspace could not be loaded. Try again.",
      500,
      true,
    );
  }
}
