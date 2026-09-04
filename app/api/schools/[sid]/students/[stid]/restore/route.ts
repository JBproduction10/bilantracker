import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canManageStudents, requireCondition } from "@/lib/authz";

export const POST = withAuth(async (_req, { params }, user) => {
  requireCondition(canManageStudents(user, params.sid));
  const student = await data.restoreStudent(params.sid, params.stid);
  await logAudit({
    actor: user, action: "student.restore", schoolId: params.sid,
    targetType: "student", targetId: student.id, targetLabel: student.name,
    details: { className: student.className },
  });
  return json(student);
});
