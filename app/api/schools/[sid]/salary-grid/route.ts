import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { notifyUsers } from "@/lib/notifications-data";
import { listUserIdsByRole } from "@/lib/users-data";
import { canViewSalaryGrid, canSubmitSalaryGrid, requireCondition } from "@/lib/authz";
import type { SalaryGridStatus } from "@/lib/types";

export const GET = withAuth(async (req, { params }, user) => {
  requireCondition(canViewSalaryGrid(user, params.sid));
  const status = new URL(req.url).searchParams.get("status") as SalaryGridStatus | null;
  const submissions = await data.listSalaryGridSubmissions(params.sid, status || undefined);
  return json(submissions);
});

export const POST = withAuth(async (req, { params }, user) => {
  requireCondition(canSubmitSalaryGrid(user), "Only Bonté Service and the site admin push a salary grid.");
  const body = await req.json();
  const submission = await data.submitSalaryGrid(params.sid, body, user.name || user.email || undefined);
  await logAudit({
    actor: user, action: "salary_grid.submit", schoolId: params.sid, schoolName: submission.schoolName,
    targetType: "salary_grid", targetId: submission.id, targetLabel: submission.period,
    details: { period: submission.period, employees: submission.entries.length },
  });

  // Best-effort: let the site admin know a new salary grid is waiting on
  // their decision. Never let a notification hiccup fail the submission.
  try {
    const decidingIds = await listUserIdsByRole(["super_admin"]);
    await notifyUsers(decidingIds, {
      schoolId: params.sid,
      type: "salary_grid.submitted",
      title: "Nouvelle grille salariale",
      message: `Bonté Service a soumis une grille salariale pour ${submission.schoolName} — période ${submission.period} (${submission.entries.length} employés).`,
      link: "/salary-grid",
    });
  } catch (notifyErr) {
    console.error("Failed to notify of new salary grid submission:", notifyErr);
  }

  return json(submission, { status: 201 });
});
