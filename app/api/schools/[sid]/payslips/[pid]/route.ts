import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canSendPayslips, requireCondition } from "@/lib/authz";

export const PATCH = withAuth(async (req, { params }, user) => {
  // Setting a payslip's status by hand is how a slip gets marked "sent"
  // outside the actual send flow, so it's gated the same way.
  requireCondition(canSendPayslips(user), "Seul le super admin peut envoyer les fiches de paie.");
  const { status } = await req.json();
  const slip = await data.setPayslipStatus(params.sid, params.pid, status);
  await logAudit({
    actor: user, action: "payslip.status", schoolId: params.sid,
    targetType: "payslip", targetId: slip.id, targetLabel: slip.period,
    details: { period: slip.period, status: slip.status, net: slip.net },
  });
  return json(slip);
});
