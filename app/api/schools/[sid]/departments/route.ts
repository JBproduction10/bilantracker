import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canManageSchool, requireCondition } from "@/lib/authz";

export const POST = withAuth(async (req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const body = await req.json();
  const dept = await data.addDepartment(params.sid, body);
  await logAudit({
    actor: user, action: "department.add", schoolId: params.sid,
    targetType: "department", targetId: dept.id, targetLabel: dept.name,
  });
  return json(dept, { status: 201 });
});
