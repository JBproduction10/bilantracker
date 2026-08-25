import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canManageSchool, requireCondition } from "@/lib/authz";

export const POST = withAuth(async (req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const { period } = await req.json();
  const result = await data.sendAllDrafts(params.sid, period);
  await logAudit({
    actor: user, action: "payslip.send_all", schoolId: params.sid,
    targetType: "payslip", targetLabel: period,
    details: {
      period, sent: result.sent, attempted: result.attempted,
      failed: result.failures.length, simulated: result.simulated,
    },
  });
  return json({
    ok: true, sent: result.sent, attempted: result.attempted,
    simulated: result.simulated, failures: result.failures,
  });
});
