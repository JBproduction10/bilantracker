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
  await data.removeStudent(params.sid, params.stid);
  // Soft delete — the record and its payment history stay in place so it
  // can be restored from the Trash view; nothing is cascaded here.
  await logAudit({
    actor: user, action: "student.remove", schoolId: params.sid,
    targetType: "student", targetId: params.stid, targetLabel: target?.name,
    details: { className: target?.className, monthlyFee: target?.monthlyFee },
  });
  return new Response(null, { status: 204 });
});
