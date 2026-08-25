import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canManageSchool, requireCondition } from "@/lib/authz";

export const POST = withAuth(async (req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const body = await req.json();
  const result = await data.sendReceipt(params.sid, params.stid, body, user.name || user.email || undefined);
  await logAudit({
    actor: user, action: "receipt.send", schoolId: params.sid,
    targetType: "student", targetId: params.stid,
    details: { period: body.period, guardianEmail: body.guardianEmail, simulated: result.simulated },
  });
  return json({ ok: true, simulated: result.simulated });
});
