import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { canManageSchool, requireCondition } from "@/lib/authz";

export const PATCH = withAuth(async (req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const { status } = await req.json();
  const slip = await data.setPayslipStatus(params.sid, params.pid, status);
  return json(slip);
});
