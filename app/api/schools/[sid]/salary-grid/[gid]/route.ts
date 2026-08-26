import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canDecideSalaryGrid, requireCondition } from "@/lib/authz";
import type { AuditAction } from "@/lib/types";

export const PATCH = withAuth(async (req, { params }, user) => {
  requireCondition(canDecideSalaryGrid(user), "Only the site admin applies or rejects a salary grid.");
  const body = await req.json();
  const submission = await data.decideSalaryGrid(params.sid, params.gid, body, user.name || user.email || undefined);

  let sendResult: Awaited<ReturnType<typeof data.sendAllDrafts>> | null = null;
  if (submission.status === "applied") {
    // Generating and sending are one motion from the super admin's side —
    // Bonté Service pushed the numbers, so there's nothing left for a
    // school to do but receive the printed slips.
    sendResult = await data.sendAllDrafts(params.sid, submission.period);
    await data.recordSalaryGridSendResult(params.sid, submission.id, sendResult.sent);
    submission.sentCount = sendResult.sent;
  }

  const action: AuditAction = body.action === "reject" ? "salary_grid.reject" : "salary_grid.apply";
  await logAudit({
    actor: user, action, schoolId: params.sid, schoolName: submission.schoolName,
    targetType: "salary_grid", targetId: submission.id, targetLabel: submission.period,
    details: { status: submission.status, generatedCount: submission.generatedCount, sentCount: submission.sentCount },
  });

  return json({ submission, sendResult });
});
