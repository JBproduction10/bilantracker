import { withAuth } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canManageStudents, requireCondition } from "@/lib/authz";

export const DELETE = withAuth(async (_req, { params }, user) => {
  requireCondition(canManageStudents(user, params.sid));
  const school = await data.getSchool(params.sid);
  const removed = school?.feeAdjustments.find((a) => a.id === params.aid);
  const student = school?.students.find((s) => s.id === removed?.studentId);
  await data.removeFeeAdjustment(params.sid, params.aid);
  await logAudit({
    actor: user, action: "fee_adjustment.remove", schoolId: params.sid,
    targetType: "fee_adjustment", targetId: params.aid, targetLabel: student?.name,
    details: { studentId: removed?.studentId, period: removed?.period, amountDue: removed?.amountDue, reason: removed?.reason },
  });
  return new Response(null, { status: 204 });
});
