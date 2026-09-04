import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canManageSchool, canManageStudents, requireCondition } from "@/lib/authz";

export const POST = withAuth(async (_req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid) || canManageStudents(user, params.sid));
  const school = await data.getSchool(params.sid);
  const request = school?.receiptRequests.find((r) => r.id === params.rid);
  await data.declineReceiptRequest(params.sid, params.rid, user.name || user.email || undefined);
  await logAudit({
    actor: user, action: "receipt_request.decline", schoolId: params.sid,
    targetType: "receipt_request", targetId: params.rid, targetLabel: request?.studentName,
    details: { period: request?.period },
  });
  return json({ ok: true });
});
