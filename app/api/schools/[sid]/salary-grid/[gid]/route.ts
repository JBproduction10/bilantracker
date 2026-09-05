import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { notifyUsers } from "@/lib/notifications-data";
import { listUserIdsByRole } from "@/lib/users-data";
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

  // Best-effort: let this promoter's own Bonté Service (who pushed the
  // grid, if there is one) and the school's own admin (whose payslips just
  // moved) know the outcome.
  try {
    const promoterId = await data.getSchoolPromoterId(params.sid);
    const [treasuryIds, schoolAdminIds] = await Promise.all([
      promoterId ? listUserIdsByRole(["treasury"], undefined, promoterId) : Promise.resolve([]),
      listUserIdsByRole(["school_admin"], params.sid),
    ]);
    const verb = submission.status === "applied" ? "appliquée" : "rejetée";
    await notifyUsers([...treasuryIds, ...schoolAdminIds], {
      schoolId: params.sid,
      type: "salary_grid.decided",
      title: "Grille salariale mise à jour",
      message: `La grille salariale pour ${submission.schoolName} — période ${submission.period} — a été ${verb}${submission.sentCount ? ` (${submission.sentCount} bulletins envoyés)` : ""}.`,
      link: "/salary-grid",
    });
  } catch (notifyErr) {
    console.error("Failed to notify of salary grid decision:", notifyErr);
  }

  return json({ submission, sendResult });
});
