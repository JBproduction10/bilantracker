import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canManageSchool, requireCondition } from "@/lib/authz";

export const POST = withAuth(async (req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const body = await req.json();
  const employee = await data.addEmployee(params.sid, body);
  await logAudit({
    actor: user, action: "employee.add", schoolId: params.sid,
    targetType: "employee", targetId: employee.id, targetLabel: employee.name,
    details: { position: employee.position, baseSalary: employee.baseSalary },
  });
  return json(employee, { status: 201 });
});
