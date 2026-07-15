import { NextResponse } from "next/server";

import { ClientIdSchema } from "@/lib/contracts";
import { prepareKiroExecution } from "@/lib/db";
import {
  cancelKiroExecution,
  kiroExecutionAvailability,
} from "@/lib/kiro-execution";
import { safeError } from "@/lib/safe-error";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ roomId: string; runId: string }> };

export async function POST(request: Request, context: RouteContext) {
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
    return safeError("INVALID_KIRO_EXECUTION", "Kiro could not be stopped.", 400);
  }

  const { roomId, runId } = await context.params;
  const membership = prepareKiroExecution({ roomId, clientId: clientId.data });
  if (membership.status !== "ready") {
    return safeError("KIRO_EXECUTION_FORBIDDEN", "Kiro could not be stopped.", 403);
  }
  if (!cancelKiroExecution(roomId, runId)) {
    return safeError("KIRO_RUN_NOT_RUNNING", "This Kiro run is not active.", 409);
  }
  return NextResponse.json({ status: "cancelled" });
}
