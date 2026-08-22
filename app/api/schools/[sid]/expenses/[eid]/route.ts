import { withAuth } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { canManageSchool, requireCondition } from "@/lib/authz";

export const DELETE = withAuth(async (_req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  await data.removeExpense(params.sid, params.eid);
  return new Response(null, { status: 204 });
});
