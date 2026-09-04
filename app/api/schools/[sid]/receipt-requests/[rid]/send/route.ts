import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canManageSchool, canManageStudents, requireCondition } from "@/lib/authz";

export const POST = withAuth(async (req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid) || canManageStudents(user, params.sid));
  const { studentId, guardianEmail, guardianName } = await req.json();
  const school = await data.getSchool(params.sid);
  if (!school) return json({ error: "School not found." }, { status: 404 });
  const request = school.receiptRequests.find((r) => r.id === params.rid);
  if (!request) return json({ error: "Request not found." }, { status: 404 });

  const result = await data.sendReceipt(
    params.sid,
    studentId,
    {
      period: request.period,
      guardianEmail: guardianEmail || request.guardianEmail,
      guardianName: guardianName || request.guardianName,
    },
    user.name || user.email || undefined,
    params.rid
  );
  await logAudit({
    actor: user, action: "receipt_request.send", schoolId: params.sid,
    targetType: "receipt_request", targetId: params.rid, targetLabel: request.studentName,
    details: { period: request.period, linkedStudentId: studentId, simulated: result.simulated },
  });
  return json({ ok: true, simulated: result.simulated });
});
