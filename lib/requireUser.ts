import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import type { SessionUser } from "./types";

/**
 * Returns the session user, or null if there isn't one.
 * Usage: const user = await requireUser(); if (!user) return unauthorized();
 */
export async function requireUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as SessionUser) || null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
}
