import { NextRequest, NextResponse } from "next/server";
import * as users from "@/lib/users-data";
import { checkRateLimit, assertNotRateLimited, getClientIp } from "@/lib/rateLimit";

// Deliberately NOT wrapped in withAuth — the whole point is that the person
// isn't logged in yet. The invite token itself is the credential here.
// Rate limited the same way as reset-password, for the same reasons.

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(`checkinvite:ip:${ip}`, { limit: 30, windowMs: 15 * 60 * 1000 });
  if (!allowed) return NextResponse.json({ valid: false, reason: "Trop de tentatives. Réessayez plus tard." });

  const token = req.nextUrl.searchParams.get("token") || "";
  if (!token) return NextResponse.json({ valid: false, reason: "Lien manquant." });
  const result = await users.checkInviteToken(token);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    assertNotRateLimited(`setpw:ip:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
    const body = await req.json();
    await users.setPasswordWithToken(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = (err as { status?: number }).status || 400;
    return NextResponse.json({ error: (err as Error).message || "Something went wrong." }, { status });
  }
}
