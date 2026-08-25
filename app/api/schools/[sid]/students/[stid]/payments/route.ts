import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canManageSchool, requireCondition } from "@/lib/authz";

export const POST = withAuth(async (req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const body = await req.json();
  const payment = await data.addPayment(params.sid, params.stid, body, user.name || user.email || undefined);
  const school = await data.getSchool(params.sid);
  const student = school?.students.find((s) => s.id === params.stid);
  await logAudit({
    actor: user, action: "payment.add", schoolId: params.sid,
    targetType: "payment", targetId: payment.id, targetLabel: student?.name,
    details: { studentId: params.stid, period: payment.period, amount: payment.amount, method: payment.method },
  });
  return json(payment, { status: 201 });
});
