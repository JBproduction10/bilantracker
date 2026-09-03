import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canSendPayslips, requireCondition } from "@/lib/authz";

export const POST = withAuth(async (_req, { params }, user) => {
  requireCondition(canSendPayslips(user), "Seul le super admin peut envoyer les fiches de paie.");
  const result = await data.sendPayslip(params.sid, params.pid);
  await logAudit({
    actor: user, action: "payslip.send", schoolId: params.sid,
    targetType: "payslip", targetId: params.pid,
    details: { simulated: result.simulated },
  });
  return json({ ok: true, simulated: result.simulated });
});
