import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "./requireUser";
import type { SessionUser } from "./types";

interface ErrorWithStatus extends Error {
  status?: number;
}

type RouteContext<P extends Record<string, string> = Record<string, string>> = { params: P };

type Handler<P extends Record<string, string>> = (
  req: NextRequest,
  ctx: RouteContext<P>,
  user: SessionUser
) => Promise<Response>;

/**
 * Wraps a route handler: checks auth, catches thrown errors and returns
 * them as { error } JSON with a 400 status, so data-layer functions can
 * just `throw new Error("message")` for validation failures.
 */
export function withAuth<P extends Record<string, string> = Record<string, string>>(fn: Handler<P>) {
  return async (req: NextRequest, ctx: RouteContext<P>) => {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    try {
      return await fn(req, ctx, user);
    } catch (err) {
      const e = err as ErrorWithStatus;
      const status = e.status || 400;
      return NextResponse.json({ error: e.message || "Something went wrong." }, { status });
    }
  };
}

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}
