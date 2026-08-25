import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canManageSchool, requireCondition } from "@/lib/authz";

export const POST = withAuth(async (req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const body = await req.json();
  const adjustment = await data.setFeeAdjustment(params.sid, params.stid, body, user.name || user.email || undefined);
  const school = await data.getSchool(params.sid);
  const student = school?.students.find((s) => s.id === params.stid);
  await logAudit({
    actor: user, action: "fee_adjustment.set", schoolId: params.sid,
    targetType: "fee_adjustment", targetId: adjustment.id, targetLabel: student?.name,
    details: { studentId: params.stid, period: adjustment.period, amountDue: adjustment.amountDue, reason: adjustment.reason },
  });
  return json(adjustment, { status: 201 });
});
