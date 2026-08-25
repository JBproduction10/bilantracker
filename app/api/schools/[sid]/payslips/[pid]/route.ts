import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canManageSchool, requireCondition } from "@/lib/authz";

export const PATCH = withAuth(async (req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const { status } = await req.json();
  const slip = await data.setPayslipStatus(params.sid, params.pid, status);
  await logAudit({
    actor: user, action: "payslip.status", schoolId: params.sid,
    targetType: "payslip", targetId: slip.id, targetLabel: slip.period,
    details: { period: slip.period, status: slip.status, net: slip.net },
  });
  return json(slip);
});
