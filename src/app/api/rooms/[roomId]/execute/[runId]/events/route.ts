import { ClientIdSchema } from "@/lib/contracts";
import { prepareKiroExecution } from "@/lib/db";
import {
  getKiroExecution,
  kiroExecutionAvailability,
  subscribeToKiroExecution,
  type KiroExecutionSnapshot,
} from "@/lib/kiro-execution";
import { safeError } from "@/lib/safe-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ roomId: string; runId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const availability = kiroExecutionAvailability(request);
  if (!availability.available) {
    return safeError(
      "KIRO_EXECUTION_UNAVAILABLE",
      availability.reason ?? "Local Kiro execution is unavailable.",
      403,
    );
  }

  const clientId = ClientIdSchema.safeParse(
    new URL(request.url).searchParams.get("clientId"),
  );
  if (!clientId.success) {
    return safeError("INVALID_KIRO_EXECUTION", "Execution stream is unavailable.", 400);
  }

  const { roomId, runId } = await context.params;
  const membership = prepareKiroExecution({ roomId, clientId: clientId.data });
  if (membership.status !== "ready") {
    return safeError("KIRO_EXECUTION_FORBIDDEN", "Execution stream is unavailable.", 403);
  }
  if (!getKiroExecution(roomId, runId)) {
    return safeError("KIRO_RUN_NOT_FOUND", "This Kiro run is no longer available.", 404);
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: NodeJS.Timeout | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const close = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe?.();
        controller.close();
      };
      const send = (snapshot: KiroExecutionSnapshot) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(snapshot)}\n\n`),
        );
        if (snapshot.status !== "running") close();
      };

      unsubscribe = subscribeToKiroExecution(roomId, runId, send);
      if (closed) {
        unsubscribe?.();
        return;
      }
      heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 15_000);
      request.signal.addEventListener("abort", close, { once: true });
    },
    cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
