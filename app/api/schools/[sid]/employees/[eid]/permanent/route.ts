import { withAuth } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canManageSchool, requireCondition } from "@/lib/authz";

export const DELETE = withAuth(async (_req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const school = await data.getSchool(params.sid);
  const target = school?.employees.find((e) => e.id === params.eid);
  await data.permanentlyDeleteEmployee(params.sid, params.eid);
  await logAudit({
    actor: user, action: "employee.permanent_delete", schoolId: params.sid,
    targetType: "employee", targetId: params.eid, targetLabel: target?.name,
    details: { position: target?.position, baseSalary: target?.baseSalary },
  });
  return new Response(null, { status: 204 });
});
