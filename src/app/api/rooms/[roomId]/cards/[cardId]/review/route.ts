import { NextResponse } from "next/server";

import { ReviewProposalInputSchema } from "@/lib/contracts";
import { reviewProposal } from "@/lib/db";
import { safeError } from "@/lib/safe-error";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ roomId: string; cardId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const input = ReviewProposalInputSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!input.success) {
      return safeError(
        "INVALID_REVIEW_INPUT",
        "Choose Approve or Reject for this proposal.",
        400,
      );
    }

    const { roomId, cardId } = await context.params;
    const result = reviewProposal({ roomId, cardId, ...input.data });
    if (result.status === "room-missing") {
      return safeError("ROOM_NOT_FOUND", "This workspace does not exist.", 404);
    }
    if (result.status === "participant-missing") {
      return safeError(
        "PARTICIPANT_NOT_FOUND",
        "Join this workspace before reviewing proposals.",
        403,
      );
    }
    if (result.status === "card-not-proposed") {
      return safeError(
        "PROPOSAL_NOT_REVIEWABLE",
        "This proposal is no longer available for review.",
        409,
      );
    }

    return NextResponse.json({ status: result.status });
  } catch {
    return safeError(
      "PROPOSAL_REVIEW_FAILED",
      "Proposal could not be reviewed. Try again.",
      500,
      true,
    );
  }
}
