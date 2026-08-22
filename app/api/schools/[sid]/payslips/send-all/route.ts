import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { canManageSchool, requireCondition } from "@/lib/authz";

export const POST = withAuth(async (req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const { period } = await req.json();
  const result = await data.sendAllDrafts(params.sid, period);
  return json({ ok: true, sent: result.sent, simulated: result.simulated });
});
