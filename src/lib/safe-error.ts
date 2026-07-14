import { NextResponse } from "next/server";

import type { SafeErrorResponse } from "@/lib/contracts";

export function safeError(
  code: string,
  message: string,
  status: number,
  retryable = false,
): NextResponse<SafeErrorResponse> {
  return NextResponse.json(
    { error: { code, message, retryable } },
    { status },
  );
}
