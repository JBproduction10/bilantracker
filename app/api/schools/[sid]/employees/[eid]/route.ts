import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canManageSchool, requireCondition } from "@/lib/authz";

export const PUT = withAuth(async (req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const body = await req.json();
  const employee = await data.updateEmployee(params.sid, params.eid, body);
  await logAudit({
    actor: user, action: "employee.update", schoolId: params.sid,
    targetType: "employee", targetId: employee.id, targetLabel: employee.name,
    details: { position: employee.position, baseSalary: employee.baseSalary, status: employee.status },
  });
  return json(employee);
});

export const DELETE = withAuth(async (_req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const school = await data.getSchool(params.sid);
  const target = school?.employees.find((e) => e.id === params.eid);
  await data.removeEmployee(params.sid, params.eid);
  await logAudit({
    actor: user, action: "employee.remove", schoolId: params.sid,
    targetType: "employee", targetId: params.eid, targetLabel: target?.name,
    details: { position: target?.position, baseSalary: target?.baseSalary },
  });
  return new Response(null, { status: 204 });
});
