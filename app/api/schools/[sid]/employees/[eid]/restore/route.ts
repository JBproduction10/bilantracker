import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canManageSchool, requireCondition } from "@/lib/authz";

export const POST = withAuth(async (_req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const employee = await data.restoreEmployee(params.sid, params.eid);
  await logAudit({
    actor: user, action: "employee.restore", schoolId: params.sid,
    targetType: "employee", targetId: employee.id, targetLabel: employee.name,
    details: { position: employee.position },
  });
  return json(employee);
});
