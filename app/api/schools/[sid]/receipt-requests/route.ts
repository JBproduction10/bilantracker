import { NextRequest, NextResponse } from "next/server";
import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { canManageSchool, canManageStudents, requireCondition } from "@/lib/authz";
import { assertNotRateLimited, getClientIp } from "@/lib/rateLimit";

// POST is deliberately public — a parent has no account, so this is the
// only way a receipt request comes into existence. GET (the admin queue)
// stays behind auth like everything else.
//
// Rate limited two ways: by IP (a parent submits a handful of requests at
// most, not dozens) and, once we know the email, by that guardian email too
// — so one address can't be used to spam a school's queue from many IPs.
export async function POST(req: NextRequest, { params }: { params: { sid: string } }) {
  try {
    const ip = getClientIp(req);
    assertNotRateLimited(`receipt:ip:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 });

    const body = await req.json();
    if (body?.guardianEmail && typeof body.guardianEmail === "string") {
      const cleanEmail = body.guardianEmail.trim().toLowerCase();
      assertNotRateLimited(`receipt:email:${cleanEmail}`, { limit: 5, windowMs: 24 * 60 * 60 * 1000 });
    }

    const request = await data.addReceiptRequest(params.sid, body);
    return NextResponse.json(request, { status: 201 });
  } catch (err) {
    const status = (err as { status?: number }).status || 400;
    return NextResponse.json({ error: (err as Error).message || "Something went wrong." }, { status });
  }
}

export const GET = withAuth(async (req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid) || canManageStudents(user, params.sid));
  const status = new URL(req.url).searchParams.get("status") || undefined;
  const list = await data.listReceiptRequests(params.sid, status as "pending" | "sent" | "declined" | undefined);
  return json(list);
});
