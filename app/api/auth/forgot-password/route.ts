import { NextRequest, NextResponse } from "next/server";
import * as users from "@/lib/users-data";
import { assertNotRateLimited, getClientIp, RateLimitedError } from "@/lib/rateLimit";
import { isValidEmail, normalizeEmail } from "@/lib/validation";

// Public by necessity — this is how someone gets back into an account they
// forgot the password to. Always responds the same way regardless of
// whether the email matches an account, so this endpoint can't be used to
// enumerate who has an account on the site. Two exceptions are safe to
// report honestly, because neither says anything about any particular
// account: a rate limit hit, and a malformed email (catching a typo here
// is just good UX, not an information leak).
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    assertNotRateLimited(`forgot:ip:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 });

    const { email } = await req.json();
    if (email && typeof email === "string") {
      if (!isValidEmail(email)) {
        return NextResponse.json({ error: "Cette adresse email n'est pas valide." }, { status: 400 });
      }
      const cleanEmail = normalizeEmail(email);
      assertNotRateLimited(`forgot:email:${cleanEmail}`, { limit: 3, windowMs: 15 * 60 * 1000 });
      await users.requestPasswordReset(cleanEmail);
    }
  } catch (err) {
    if (err instanceof RateLimitedError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    // Swallow everything else — never let this endpoint reveal anything.
  }
  return NextResponse.json({ ok: true });
}
