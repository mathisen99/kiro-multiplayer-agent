import { NextResponse } from "next/server";

import { ClientIdSchema } from "@/lib/contracts";
import { prepareKiroExecution } from "@/lib/db";
import {
  kiroExecutionAvailability,
  startKiroExecution,
} from "@/lib/kiro-execution";
import { safeError } from "@/lib/safe-error";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ roomId: string }> };

export async function GET(request: Request) {
  return NextResponse.json(kiroExecutionAvailability(request));
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const availability = kiroExecutionAvailability(request);
    if (!availability.available) {
      return safeError(
        "KIRO_EXECUTION_UNAVAILABLE",
        availability.reason ?? "Local Kiro execution is unavailable.",
        403,
      );
    }

    const body = (await request.json().catch(() => null)) as
      | { clientId?: unknown }
      | null;
    const clientId = ClientIdSchema.safeParse(body?.clientId);
    if (!clientId.success) {
      return safeError("INVALID_KIRO_EXECUTION", "Kiro execution could not start.", 400);
    }

    const { roomId } = await context.params;
    const prepared = prepareKiroExecution({ roomId, clientId: clientId.data });
    if (prepared.status === "room-missing") {
      return safeError("ROOM_NOT_FOUND", "This workspace does not exist.", 404);
    }
    if (prepared.status === "participant-missing") {
      return safeError(
        "PARTICIPANT_NOT_FOUND",
        "Join this workspace before running Kiro.",
        403,
      );
    }
    if (prepared.status === "artifact-missing") {
      return safeError(
        "ARTIFACT_NOT_FOUND",
        "Generate the final plan before running Kiro.",
        409,
      );
    }
    if (prepared.status !== "ready") {
      return safeError("KIRO_EXECUTION_FAILED", "Kiro execution could not start.", 500);
    }

    const result = startKiroExecution({
      roomId,
      roomName: prepared.roomName,
      title: prepared.title,
      markdown: prepared.markdown,
    });
    if (result.status === "busy") {
      return safeError(
        "KIRO_EXECUTION_BUSY",
        "Kiro is already building this room's plan.",
        409,
        true,
      );
    }
    return NextResponse.json({ run: result.run }, { status: 201 });
  } catch {
    return safeError(
      "KIRO_EXECUTION_FAILED",
      "Kiro execution could not start. Check the local CLI configuration.",
      500,
      true,
    );
  }
}
