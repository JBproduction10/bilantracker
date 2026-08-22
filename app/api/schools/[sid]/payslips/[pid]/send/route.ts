import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { canManageSchool, requireCondition } from "@/lib/authz";

export const POST = withAuth(async (_req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const result = await data.sendPayslip(params.sid, params.pid);
  return json({ ok: true, simulated: result.simulated });
});
