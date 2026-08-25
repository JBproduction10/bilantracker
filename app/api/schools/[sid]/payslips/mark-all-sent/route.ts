import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canManageSchool, requireCondition } from "@/lib/authz";

export const POST = withAuth(async (req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const { period } = await req.json();
  await data.markAllSent(params.sid, period);
  await logAudit({
    actor: user, action: "payslip.mark_all_sent", schoolId: params.sid,
    targetType: "payslip", targetLabel: period, details: { period },
  });
  return json({ ok: true });
});
