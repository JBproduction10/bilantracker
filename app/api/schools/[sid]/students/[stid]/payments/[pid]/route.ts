import { withAuth } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canManageStudents, requireCondition } from "@/lib/authz";

export const DELETE = withAuth(async (_req, { params }, user) => {
  requireCondition(canManageStudents(user, params.sid));
  const school = await data.getSchool(params.sid);
  const removed = school?.payments.find((p) => p.id === params.pid);
  const student = school?.students.find((s) => s.id === removed?.studentId);
  await data.removePayment(params.sid, params.pid);
  // Voiding a payment is the single most sensitive write in this app —
  // capture everything about what was removed.
  await logAudit({
    actor: user, action: "payment.remove", schoolId: params.sid,
    targetType: "payment", targetId: params.pid, targetLabel: student?.name,
    details: {
      studentId: removed?.studentId, period: removed?.period,
      amount: removed?.amount, method: removed?.method, originalDate: removed?.date,
    },
  });
  return new Response(null, { status: 204 });
});
