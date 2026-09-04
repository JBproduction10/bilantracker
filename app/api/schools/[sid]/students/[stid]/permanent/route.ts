import { withAuth } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canManageStudents, requireCondition } from "@/lib/authz";

export const DELETE = withAuth(async (_req, { params }, user) => {
  requireCondition(canManageStudents(user, params.sid));
  const school = await data.getSchool(params.sid);
  const target = school?.students.find((s) => s.id === params.stid);
  const paymentCount = school?.payments.filter((p) => p.studentId === params.stid).length || 0;
  await data.permanentlyDeleteStudent(params.sid, params.stid);
  // This is the irreversible one — cascades the whole payment history, so
  // the audit entry notes how many payment records went with it.
  await logAudit({
    actor: user, action: "student.permanent_delete", schoolId: params.sid,
    targetType: "student", targetId: params.stid, targetLabel: target?.name,
    details: { className: target?.className, monthlyFee: target?.monthlyFee, paymentsRemoved: paymentCount },
  });
  return new Response(null, { status: 204 });
});
