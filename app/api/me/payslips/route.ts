import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { requireCondition } from "@/lib/authz";

export const GET = withAuth(async (_req, _ctx, user) => {
  requireCondition(user.role === "teacher" && !!user.schoolId && !!user.employeeId, "No payslips linked to this account.");
  const payslips = await data.listPayslips(user.schoolId as string);
  const mine = payslips.filter((p) => p.employeeId === user.employeeId);
  const school = await data.getSchool(user.schoolId as string);
  const employee = school?.employees.find((e) => e.id === user.employeeId) || null;
  return json({ payslips: mine, school: school ? { name: school.name, color: school.color } : null, employee });
});
