import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canManageSchool, requireCondition } from "@/lib/authz";

export const PUT = withAuth(async (req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const body = await req.json();
  const dept = await data.updateDepartment(params.sid, params.did, body);
  await logAudit({
    actor: user, action: "department.update", schoolId: params.sid,
    targetType: "department", targetId: dept.id, targetLabel: dept.name,
  });
  return json(dept);
});

export const DELETE = withAuth(async (_req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const school = await data.getSchool(params.sid);
  const target = school?.departments.find((d) => d.id === params.did);
  await data.removeDepartment(params.sid, params.did);
  await logAudit({
    actor: user, action: "department.remove", schoolId: params.sid,
    targetType: "department", targetId: params.did, targetLabel: target?.name,
  });
  return new Response(null, { status: 204 });
});
