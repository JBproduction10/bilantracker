import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { notifyUsers } from "@/lib/notifications-data";
import { listUserIdsByRole } from "@/lib/users-data";
import { canNotifyPayslipsReady, requireCondition } from "@/lib/authz";

export const POST = withAuth(async (req, { params }, user) => {
  requireCondition(canNotifyPayslipsReady(user, params.sid));
  const { period } = await req.json();
  if (!period) throw new Error("Choose a pay period.");

  const school = await data.getSchool(params.sid);
  if (!school) throw new Error("School not found.");

  const draftCount = school.payslips.filter((p) => p.period === period && p.status === "draft").length;

  await logAudit({
    actor: user, action: "payslip.notify_ready", schoolId: params.sid, schoolName: school.name,
    targetType: "payslip", targetLabel: period, details: { period, draftCount },
  });

  // Best-effort: let the super admin know this school is ready for its
  // payslips to be sent. Never let a notification hiccup block the
  // school admin's action itself.
  try {
    const superAdminIds = await listUserIdsByRole(["super_admin"]);
    await notifyUsers(superAdminIds, {
      schoolId: params.sid,
      type: "payslips.ready_to_send",
      title: "Fiches de paie prêtes à envoyer",
      message: `${school.name} a signalé que tous ses employés sont enregistrés et que les fiches de paie de ${period} sont prêtes à être envoyées (${draftCount} en brouillon).`,
      link: "/send",
    });
  } catch (notifyErr) {
    console.error("Failed to notify super admin of payslip readiness:", notifyErr);
  }

  return json({ ok: true });
});
