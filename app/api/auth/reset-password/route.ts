import { NextRequest, NextResponse } from "next/server";
import * as users from "@/lib/users-data";
import { checkRateLimit, assertNotRateLimited, getClientIp } from "@/lib/rateLimit";

// Also deliberately public — the reset token itself is the credential.
// Rate limited by IP on both sides: GET so the token-check endpoint can't
// be used to brute-force valid tokens, POST so the actual password change
// can't either (on top of the token already being a 32-byte random secret).

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(`checkreset:ip:${ip}`, { limit: 30, windowMs: 15 * 60 * 1000 });
  if (!allowed) return NextResponse.json({ valid: false, reason: "Trop de tentatives. Réessayez plus tard." });

  const token = req.nextUrl.searchParams.get("token") || "";
  if (!token) return NextResponse.json({ valid: false, reason: "Lien manquant." });
  const result = await users.checkResetToken(token);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    assertNotRateLimited(`reset:ip:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
    const body = await req.json();
    await users.resetPasswordWithToken(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = (err as { status?: number }).status || 400;
    return NextResponse.json({ error: (err as Error).message || "Something went wrong." }, { status });
  }
}
