import { withAuth, json } from "@/lib/apiHelpers";
import * as users from "@/lib/users-data";
import * as schools from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { notifyUsers } from "@/lib/notifications-data";
import { ROLE_LABELS } from "@/lib/constants";
import { isSuperAdmin, requireCondition } from "@/lib/authz";

export const GET = withAuth(async (_req, _ctx, user) => {
  requireCondition(isSuperAdmin(user), "Only the site admin can manage accounts.");
  const list = await users.listUsers();
  return json(list);
});

export const POST = withAuth(async (req, _ctx, user) => {
  requireCondition(isSuperAdmin(user), "Only the site admin can create accounts.");
  const body = await req.json();
  const school = body.schoolId ? await schools.getSchool(body.schoolId) : null;
  const { user: created, invite } = await users.createUser(body, school?.name);
  await logAudit({
    actor: user, action: "user.create", schoolId: created.schoolId, schoolName: school?.name,
    targetType: "user", targetId: created.id, targetLabel: created.email,
    details: { role: created.role, simulated: invite.simulated },
  });

  // Waiting for them once they've set their password and logged in for
  // the first time — best-effort, never blocks account creation.
  try {
    await notifyUsers([created.id], {
      schoolId: created.schoolId,
      type: "user.invited",
      title: "Bienvenue sur École Bilan",
      message: `Vous avez été ajouté(e) en tant que ${ROLE_LABELS[created.role]} par ${user.name || user.email || "l'administrateur"}.`,
      link: "/dashboard",
    });
  } catch (notifyErr) {
    console.error("Failed to create welcome notification:", notifyErr);
  }

  return json({ ...created, _invite: { simulated: invite.simulated } }, { status: 201 });
});
