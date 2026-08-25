import { NextResponse } from "next/server";
import * as data from "@/lib/schools-data";

// Public and deliberately minimal: id/name/color only, no student or financial data.
// This exists so a parent with no account can pick their child's school on the
// receipt-request form.
//
// Forced dynamic: this route takes no request params, so Next.js would
// otherwise try to statically render it at build time (and call the
// database then, when none is available yet).
export const dynamic = "force-dynamic";

export async function GET() {
  const schools = await data.listSchoolsPublic();
  return NextResponse.json(schools);
}
