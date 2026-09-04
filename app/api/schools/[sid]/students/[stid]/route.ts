import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canManageStudents, requireCondition } from "@/lib/authz";

export const PUT = withAuth(async (req, { params }, user) => {
  requireCondition(canManageStudents(user, params.sid));
  const body = await req.json();
  const student = await data.updateStudent(params.sid, params.stid, body);
  await logAudit({
    actor: user, action: "student.update", schoolId: params.sid,
    targetType: "student", targetId: student.id, targetLabel: student.name,
    details: { className: student.className, monthlyFee: student.monthlyFee },
  });
  return json(student);
});

export const DELETE = withAuth(async (_req, { params }, user) => {
  requireCondition(canManageStudents(user, params.sid));
  const school = await data.getSchool(params.sid);
  const target = school?.students.find((s) => s.id === params.stid);
  const paymentCount = school?.payments.filter((p) => p.studentId === params.stid).length || 0;
  await data.removeStudent(params.sid, params.stid);
  // A student's removal cascades their whole payment history — that's
  // exactly the kind of thing this trail exists to catch, so the entry
  // notes how many payment records went with them.
  await logAudit({
    actor: user, action: "student.remove", schoolId: params.sid,
    targetType: "student", targetId: params.stid, targetLabel: target?.name,
    details: { className: target?.className, monthlyFee: target?.monthlyFee, paymentsRemoved: paymentCount },
  });
  return new Response(null, { status: 204 });
});
