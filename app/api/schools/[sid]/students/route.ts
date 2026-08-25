import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { currentPeriod } from "@/lib/fees";
import { canReadSchool, canManageSchool, requireCondition } from "@/lib/authz";

export const GET = withAuth(async (req, { params }, user) => {
  requireCondition(canReadSchool(user, params.sid));
  const period = new URL(req.url).searchParams.get("period") || currentPeriod();
  const students = await data.listStudentsWithLedger(params.sid, period);
  return json(students);
});

export const POST = withAuth(async (req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const body = await req.json();
  const student = await data.addStudent(params.sid, body);
  await logAudit({
    actor: user, action: "student.add", schoolId: params.sid,
    targetType: "student", targetId: student.id, targetLabel: student.name,
    details: { className: student.className, monthlyFee: student.monthlyFee },
  });
  return json(student, { status: 201 });
});
