import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { canManageSchool, requireCondition } from "@/lib/authz";

export const POST = withAuth(async (req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const body = await req.json();
  const student = await data.recordFeePayment(params.sid, params.stid, body, user.name || user.email || undefined);
  return json(student, { status: 201 });
});
